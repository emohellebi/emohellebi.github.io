(function () {
  "use strict";

  const chapters = {
    1: { title: "Biochemistry and the Unity of Life", concepts: [
      ["biochemistry", "The study of the molecular structures, reactions, and processes that underlie living systems."],
      ["cell", "The fundamental membrane-bounded unit of life capable of metabolism, information use, and reproduction."],
      ["prokaryote", "An organism whose cells lack a membrane-enclosed nucleus."],
      ["eukaryote", "An organism whose cells contain a membrane-enclosed nucleus and other internal organelles."],
      ["organelle", "A specialized cellular compartment that performs a defined set of functions."],
      ["plasma membrane", "A selectively permeable lipid bilayer that separates a cell from its surroundings."],
      ["metabolism", "The integrated network of chemical reactions that transforms matter and energy in a living system."],
      ["catabolism", "Metabolic pathways that break molecules down and commonly release usable energy."],
      ["anabolism", "Metabolic pathways that build complex molecules and generally require energy input."],
      ["ATP", "A nucleotide triphosphate that couples energy-releasing processes to energy-requiring cellular work."],
      ["chemical bond", "An attractive interaction that holds atoms together through the sharing or transfer of electrons."],
      ["covalent bond", "A strong chemical linkage formed when atoms share electron pairs."],
      ["noncovalent interaction", "A reversible interaction such as hydrogen bonding, electrostatic attraction, or van der Waals contact."],
      ["hydrogen bond", "An attraction involving a hydrogen attached to an electronegative atom and another electronegative group."],
      ["hydrophobic effect", "The tendency of nonpolar surfaces to associate in water, reducing their exposure to the solvent."],
      ["macromolecule", "A large biological molecule, such as a protein or nucleic acid, assembled from smaller building blocks."],
      ["genome", "The complete genetic material of a cell or organism."],
      ["central dogma", "The general flow of sequence information from DNA to RNA to protein."],
      ["evolution", "Change in inherited biological characteristics across generations."],
      ["natural selection", "Differential reproductive success that increases the frequency of heritable traits suited to an environment."]
    ]},
    2: { title: "Protein Composition and Architecture", concepts: [
      ["zwitterion", "A molecule carrying both a positive and a negative charge while remaining electrically neutral overall."],
      ["isoelectric point", "The pH at which a molecule has zero net electric charge."],
      ["peptide bond", "The planar amide linkage formed between the carboxyl group of one amino acid and the amino group of another."],
      ["Ramachandran plot", "A map of sterically allowed combinations of backbone phi and psi torsion angles."],
      ["alpha helix", "A right-handed protein secondary structure stabilized by backbone hydrogen bonds between residues four positions apart."],
      ["beta sheet", "A secondary structure built from extended strands joined by hydrogen bonds and arranged in parallel or antiparallel orientation."],
      ["beta turn", "A compact four-residue feature that reverses the direction of a polypeptide chain."],
      ["collagen triple helix", "A rope-like assembly of three chains enriched in glycine and proline-related residues."],
      ["protein domain", "A compact structural unit within a polypeptide that can often fold and function semi-independently."],
      ["quaternary structure", "The spatial arrangement and interaction of multiple polypeptide subunits in a protein complex."],
      ["hydrophobic effect", "The tendency of nonpolar groups to cluster away from water, providing a major driving force for protein folding."],
      ["Anfinsen experiment", "Evidence from reversible ribonuclease denaturation showing that amino-acid sequence can encode a protein's native structure."],
      ["folding funnel", "An energy-landscape model in which many unfolded conformations converge toward lower-energy native states."],
      ["molecular chaperone", "A protein that assists folding or prevents aggregation without becoming part of the final structure."],
      ["intrinsically disordered protein", "A functional protein or region that lacks one stable three-dimensional structure under physiological conditions."],
      ["amyloid fibril", "An ordered protein aggregate commonly characterized by cross-beta architecture."],
      ["disulfide bond", "A covalent linkage formed by oxidation of two cysteine side chains."],
      ["conservative substitution", "An amino-acid replacement with another residue having similar chemical properties."],
      ["post-translational modification", "A covalent chemical change to a protein after translation that can alter activity, localization, or stability."],
      ["protein motif", "A recurring combination of secondary-structure elements associated with a particular structural or functional pattern."]
    ]},
    3: { title: "Exploring Proteins and Proteomes", concepts: [
      ["proteome", "The complete set of proteins expressed by a cell, tissue, or organism under specified conditions."],
      ["specific activity", "Enzyme activity divided by total protein, commonly used to monitor purification."],
      ["differential centrifugation", "Sequential centrifugation at increasing speeds to separate cellular components by sedimentation behavior."],
      ["salting out", "Protein precipitation produced by high salt concentrations that compete for water and reduce protein solubility."],
      ["dialysis", "Separation of small solutes from macromolecules by diffusion through a semipermeable membrane."],
      ["size-exclusion chromatography", "Separation in which large molecules traverse a porous matrix faster than small molecules."],
      ["ion-exchange chromatography", "Separation based on reversible electrostatic interactions between proteins and charged resin."],
      ["affinity chromatography", "Purification based on a specific binding interaction between a target protein and an immobilized ligand."],
      ["SDS-PAGE", "Electrophoresis that denatures proteins, gives them similar charge-to-mass ratios, and separates mainly by size."],
      ["isoelectric focusing", "Electrophoretic separation in a pH gradient where proteins migrate until reaching their isoelectric points."],
      ["two-dimensional electrophoresis", "Protein separation that typically combines isoelectric focusing with SDS-PAGE."],
      ["sedimentation coefficient", "A measure, expressed in Svedberg units, describing how rapidly a particle sediments in a centrifugal field."],
      ["monoclonal antibody", "A uniform antibody population produced from one B-cell clone and recognizing one epitope."],
      ["polyclonal antibody", "A mixture of antibodies from multiple B-cell clones that recognize different epitopes on an antigen."],
      ["ELISA", "An enzyme-linked antibody assay used to detect or quantify a target molecule."],
      ["western blot", "Detection of a specific protein after electrophoretic separation and transfer to a membrane."],
      ["MALDI-TOF", "Mass spectrometry combining matrix-assisted laser desorption/ionization with time-of-flight mass analysis."],
      ["tandem mass spectrometry", "A method that selects an ion, fragments it, and analyzes the products to infer peptide sequence."],
      ["Edman degradation", "Stepwise chemical removal and identification of amino-terminal residues from a peptide."],
      ["X-ray crystallography", "A structural method that infers electron density from diffraction by an ordered crystal."]
    ]},
    4: { title: "DNA, RNA, and Information Flow", concepts: [
      ["phosphodiester bond", "The covalent linkage connecting the 3-prime hydroxyl of one nucleotide to the 5-prime phosphate of the next."],
      ["antiparallel strands", "The opposite 5-prime-to-3-prime orientations of the two strands in a nucleic-acid duplex."],
      ["base stacking", "Favorable interactions among adjacent aromatic bases that strongly stabilize nucleic-acid structure."],
      ["B-DNA", "The common physiological right-handed DNA helix with bases nearly perpendicular to the helix axis."],
      ["Z-DNA", "A left-handed DNA helix favored by certain alternating sequences and solution conditions."],
      ["DNA supercoiling", "Coiling of the DNA double helix axis that compacts DNA and changes torsional strain."],
      ["semiconservative replication", "Replication in which each daughter duplex contains one parental strand and one newly synthesized strand."],
      ["Meselson-Stahl experiment", "Density-labeling evidence that distinguished semiconservative DNA replication from competing models."],
      ["DNA melting temperature", "The temperature at which half of a DNA duplex population is denatured under defined conditions."],
      ["hyperchromic effect", "The rise in ultraviolet absorbance that accompanies disruption of base stacking during nucleic-acid denaturation."],
      ["DNA polymerase", "An enzyme that extends a DNA chain in the 5-prime-to-3-prime direction using a template."],
      ["reverse transcriptase", "An enzyme that synthesizes DNA using RNA as the template."],
      ["template strand", "The DNA strand read by RNA polymerase to synthesize a complementary RNA."],
      ["coding strand", "The DNA strand whose sequence matches the RNA product except that DNA contains thymine instead of uracil."],
      ["promoter", "A DNA region that recruits transcription machinery and specifies where transcription begins."],
      ["5-prime cap", "A modified guanine structure added to eukaryotic messenger RNA that supports stability, export, and translation."],
      ["poly(A) tail", "A post-transcriptional stretch of adenylate residues that influences messenger-RNA stability and translation."],
      ["tRNA anticodon", "A three-nucleotide sequence in transfer RNA that pairs with a messenger-RNA codon."],
      ["degenerate genetic code", "The property that more than one codon can specify the same amino acid."],
      ["alternative splicing", "Production of different mature RNAs from one precursor by selecting different exon combinations."]
    ]},
    5: { title: "Genes and Genomes", concepts: [
      ["restriction endonuclease", "An enzyme that cleaves DNA at or near a specific recognition sequence."],
      ["sticky end", "A single-stranded DNA overhang produced by staggered cleavage and able to pair with a complementary end."],
      ["Southern blot", "Detection of a specific DNA sequence after fragment separation and transfer to a membrane."],
      ["Sanger sequencing", "DNA sequencing based on chain termination by nucleotide analogs lacking a 3-prime hydroxyl group."],
      ["polymerase chain reaction", "Cyclic amplification of a defined DNA region through denaturation, primer annealing, and extension."],
      ["PCR primer", "A short nucleic acid that defines an amplification boundary and supplies a free 3-prime hydroxyl for polymerase."],
      ["cloning vector", "A replicating DNA molecule engineered to carry an inserted DNA fragment into a host."],
      ["selectable marker", "A vector gene that permits cells carrying the vector to survive or be identified under selective conditions."],
      ["genomic library", "A collection of cloned DNA fragments intended to represent an organism's entire genome."],
      ["cDNA library", "A collection of DNA copies synthesized from messenger RNAs and therefore representing expressed genes."],
      ["expression vector", "A vector containing regulatory elements designed to produce RNA or protein from an inserted sequence."],
      ["site-directed mutagenesis", "A technique that introduces a planned sequence change at a chosen position in DNA."],
      ["next-generation sequencing", "Massively parallel sequencing that reads many DNA molecules simultaneously."],
      ["quantitative PCR", "PCR monitored during amplification to estimate the starting amount of a target nucleic acid."],
      ["DNA microarray", "A surface carrying many probes used to measure complementary nucleic-acid targets in parallel."],
      ["transgenic organism", "An organism carrying introduced genetic material that can be inherited or expressed."],
      ["gene knockout", "A genetic alteration that disables or removes a selected gene to investigate its function."],
      ["TALEN", "A programmable nuclease combining sequence-specific TAL effector DNA-binding modules with a cleavage domain."],
      ["RNA interference", "Sequence-directed gene silencing mediated by small RNAs and protein complexes."],
      ["gene therapy", "Treatment that introduces, removes, or modifies genetic material in a patient's cells."]
    ]},
    6: { title: "Evolution and Bioinformatics", concepts: [
      ["homologous proteins", "Proteins related through descent from a common ancestral sequence."],
      ["orthologs", "Homologous genes in different species that separated through speciation."],
      ["paralogs", "Homologous genes produced by duplication within a lineage."],
      ["sequence alignment", "Arrangement of sequences to identify corresponding residues and patterns of similarity."],
      ["alignment gap", "A placeholder introduced to represent a likely insertion or deletion during sequence comparison."],
      ["BLOSUM matrix", "An empirical scoring matrix based on substitutions observed in conserved protein sequence blocks."],
      ["BLAST", "A heuristic method for finding local sequence similarities against a database."],
      ["expect value", "The number of matches with a given score expected by chance in a database search."],
      ["sequence identity", "The fraction of aligned positions containing exactly the same residue."],
      ["sequence similarity", "A broader measure that also credits chemically or evolutionarily conservative substitutions."],
      ["structural conservation", "Retention of three-dimensional fold despite potentially extensive sequence divergence."],
      ["template-based modeling", "Prediction of a target protein structure using the known structure of a related protein."],
      ["internal repeat", "A duplicated sequence pattern occurring more than once within a single polypeptide."],
      ["divergent evolution", "Accumulation of differences in descendants derived from a common ancestor."],
      ["convergent evolution", "Independent acquisition of similar features in lineages without recent common ancestry for that feature."],
      ["phylogenetic tree", "A branching hypothesis representing evolutionary relationships among sequences or organisms."],
      ["horizontal gene transfer", "Movement of genetic material between organisms outside direct parent-to-offspring inheritance."],
      ["ancient DNA", "Degraded genetic material recovered from historical or prehistoric biological remains."],
      ["directed evolution", "Laboratory cycles of variation and selection used to obtain biomolecules with desired properties."],
      ["molecular clock", "Use of accumulated sequence changes as an approximate measure of evolutionary divergence time."]
    ]}
  };

  const hash = (value) => Array.from(value).reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const shuffled = (items, seed) => {
    const copy = items.slice();
    let state = Math.abs(hash(seed)) || 1;
    for (let i = copy.length - 1; i > 0; i -= 1) {
      state = (state * 16807) % 2147483647;
      const j = state % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const questions = [];
  Object.entries(chapters).forEach(([chapter, data]) => {
    data.concepts.forEach(([term, definition], index) => {
      const distractors = data.concepts.filter((_, i) => i !== index);
      const make = (id, prompt, correct, pool, explanation) => {
        const wrong = shuffled(pool, id).slice(0, 3);
        const options = shuffled([correct, ...wrong], `${id}-options`);
        questions.push({ id, chapter: Number(chapter), chapterTitle: data.title, prompt, options, answer: options.indexOf(correct), explanation });
      };
      const base = `c${chapter}-${String(index + 1).padStart(2, "0")}`;
      make(`${base}-d`, `Which statement best describes ${term}?`, definition, distractors.map((c) => c[1]), `${term}: ${definition}`);
      make(`${base}-t`, `Which term best matches this description?\n${definition}`, term, distractors.map((c) => c[0]), `${term} is the best match.`);
    });
  });

  window.CHEM58103_BANK = { chapters, questions, examOneChapters: [2, 3, 4, 5, 6], version: 1 };
}());
