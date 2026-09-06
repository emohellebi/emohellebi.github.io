# ------------------------------------------------------------
#    Bayesian Linear Layer
#    Each weight/bias has a learned mean (mu) and log-variance (rho).
#    Weights are sampled via the reparameterization trick: w = mu + softplus(rho) * eps
# ------------------------------------------------------------

BayesianLinear <- nn_module(
  classname = "BayesianLinear",
  
  initialize = function(in_features, out_features,
                        prior_mu = 0, prior_sigma = 1) {
    self$in_features  <- in_features
    self$out_features <- out_features
    
    # Prior hyperparameters
    self$prior_mu    <- prior_mu
    self$prior_sigma <- prior_sigma
    
    # Variational parameters for weights
    self$weight_mu  <- nn_parameter(torch_empty(out_features, in_features)$normal_(0, 0.1))
    self$weight_rho <- nn_parameter(torch_empty(out_features, in_features)$fill_(-3))
    
    # Variational parameters for biases
    self$bias_mu    <- nn_parameter(torch_empty(out_features)$normal_(0, 0.1))
    self$bias_rho   <- nn_parameter(torch_empty(out_features)$fill_(-3))
    
    # Accumulators (populated during forward pass)
    self$kl <- 0
  },
  
  # sigma = softplus(rho) ensures positivity
  softplus = function(x) torch_log1p(torch_exp(x)),
  
  # Log-probability under a Gaussian
  log_gaussian = function(x, mu, sigma) {
    -0.5 * log(2 * pi) - torch_log(sigma) - 0.5 * ((x - mu) / sigma)^2
  },
  
  # KL divergence: KL[q(w|theta) || p(w)]  (computed analytically for Gaussians)
  kl_divergence = function(mu_q, sigma_q, mu_p, sigma_p) {
    (torch_log(sigma_p / sigma_q) +
       (sigma_q^2 + (mu_q - mu_p)^2) / (2 * sigma_p^2) - 0.5)$sum()
  },
  
  forward = function(x) {
    weight_sigma <- self$softplus(self$weight_rho)
    bias_sigma   <- self$softplus(self$bias_rho)
    
    # Reparameterization trick: sample weights & biases
    weight <- self$weight_mu + weight_sigma * torch_randn_like(self$weight_mu)
    bias   <- self$bias_mu   + bias_sigma   * torch_randn_like(self$bias_mu)
    
    # Accumulate KL divergence for this layer
    prior_sigma_t <- torch_full(c(1L), self$prior_sigma, dtype = torch_float())
    prior_mu_t    <- torch_full(c(1L), self$prior_mu,    dtype = torch_float())
    
    self$kl <- self$kl_divergence(self$weight_mu, weight_sigma,
                                  prior_mu_t, prior_sigma_t) +
      self$kl_divergence(self$bias_mu, bias_sigma,
                         prior_mu_t, prior_sigma_t)
    
    nnf_linear(x, weight, bias)
  }
)

# ------------------------------------------------------------
#    Bayesian Neural Network
# ------------------------------------------------------------

BayesianNN <- nn_module(
  classname = "BayesianNN",
  
  initialize = function(input_dim, hidden_dim, output_dim,
                        prior_sigma = 1.0) {
    self$fc1 <- BayesianLinear(input_dim,  hidden_dim, prior_sigma = prior_sigma)
    self$fc2 <- BayesianLinear(hidden_dim, hidden_dim, prior_sigma = prior_sigma)
    self$fc3 <- BayesianLinear(hidden_dim, output_dim, prior_sigma = prior_sigma)
  },
  
  forward = function(x) {
    x <- nnf_relu(self$fc1(x))
    x <- nnf_relu(self$fc2(x))
    self$fc3(x)
  },
  
  # Sum KL from all layers
  kl_loss = function() {
    self$fc1$kl + self$fc2$kl + self$fc3$kl
  }
)

# ------------------------------------------------------------
#    ELBO Loss
#    Loss = NLL (data fit) + (1/N) * KL[q||p]
#    The KL term is scaled by 1/dataset_size (beta-weighting).
# ------------------------------------------------------------

elbo_loss <- function(predictions, targets, model, n_samples, beta = 1.0) {
  # Negative log-likelihood (Gaussian likelihood for regression)
  nll  <- nnf_mse_loss(predictions, targets, reduction = "sum")
  kl   <- model$kl_loss()
  nll + beta * kl / n_samples
}



# ------------------------------------------------------------
# 5. Training
# ------------------------------------------------------------


bnn_fit <- function(Y = NULL, X = NULL, model = NULL, 
                    control = list(hidden_dim = 64, n_epochs = 100, lr = 1e-3)){
input_dim <- dim(X)[2]
output_dim <-dim(Y)[2]
lr <- control$lr
hidden_dim <- control$hidden_dim
n_epochs <- control$n_epochs
n <- dim(X)[1]
optimizer <- optim_adam(model$parameters, lr = lr)

cat("Training Bayesian Neural Network...\n")
cat(sprintf("%-8s %-14s %-14s %-14s\n", "Epoch", "ELBO Loss", "NLL", "KL"))
cat(strrep("-", 54), "\n")

loss_history <- numeric(n_epochs)

for (epoch in seq_len(n_epochs)) {
  optimizer$zero_grad()
  
  preds <- model(X)
  loss  <- elbo_loss(preds, Y, model, n_samples = n)
  
  loss$backward()
  optimizer$step()
  
  loss_val <- as.numeric(loss$item())
  loss_history[epoch] <- loss_val
  
  if (epoch %% 50 == 0 || epoch == 1) {
    nll_val <- as.numeric(nnf_mse_loss(preds, Y, reduction = "sum")$item())
    kl_val  <- as.numeric(model$kl_loss()$item())
    cat(sprintf("%-8d %-14.4f %-14.4f %-14.4f\n", epoch, loss_val, nll_val, kl_val))
  }
}

cat("\nTraining complete.\n\n")

return(model)
}

# ------------------------------------------------------------
#    Uncertainty Estimation via Monte Carlo Sampling
#    Run T forward passes → distribution of predictions
# ------------------------------------------------------------

bnn_predict <- function(model, x_new, n_samples = 100) {
  model$train()  # keep dropout/sampling active
  preds <- torch_stack(lapply(seq_len(n_samples), function(i) {
    model(x_new)$squeeze()
  }), dim = 2)   # shape: (n_test, n_samples)
  
  list(
    mean = preds$mean(dim = 2),
    std  = preds$std(dim = 2)
  )
}


