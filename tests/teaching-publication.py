"""Verify Teaching's public presentation allowlist and student-copy privacy.

Run with Python 3 after rendering Teaching and before publishing.
"""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as E
import hashlib,json,re,subprocess

ROOT=Path(__file__).resolve().parents[1]
NS={'p':'http://schemas.openxmlformats.org/presentationml/2006/main'}
FOLDERS={9:'guest-lecture-01-energy-systems',10:'guest-lecture-02-renewable-transition'}
allowed=set()
for chapter,slug in FOLDERS.items():
    folder=Path('teaching/courses/environmental-science/lectures')/slug
    download=folder/'downloads'/f'Chapter_{chapter}.pptx'
    allowed.update([str(download),'docs/'+str(download)])
    source=ROOT/download;rendered=ROOT/'docs'/download
    assert source.read_bytes()==rendered.read_bytes(),f'Stale rendered download: {download}'
    with ZipFile(source) as z:
        assert not any(p.startswith(('ppt/notesSlides/','ppt/notesMasters/','ppt/comments/','ppt/commentAuthors')) for p in z.namelist()),f'Private content in {download}'
        count=len(E.fromstring(z.read('ppt/presentation.xml')).find('p:sldIdLst',NS))
        canonical=ROOT/folder/f'Chapter_{chapter}.pptx'
        if canonical.exists():
            with ZipFile(canonical) as original:
                for p in z.namelist():
                    if re.fullmatch(r'ppt/slides/slide\d+\.xml',p) or p.startswith(('ppt/media/','ppt/charts/','ppt/embeddings/')):
                        assert z.read(p)==original.read(p),f'Public slide content is stale: {chapter}, {p}'
    for prefix in [Path(''),Path('docs')]:
        viewer=ROOT/prefix/folder/'slides/index.html'
        data=json.loads(re.search(r'<script id="slide-data" type="application/json">(.*?)</script>',viewer.read_text(),re.S)[1])
        assert len(data)==count,f'Stale preview count: {viewer}'
        assert all('notes' not in record for record in data)
        for record in data:assert (viewer.parent/record['image'].split('?')[0]).exists()
    print(f'Chapter {chapter}: {count} slides; current content; no notes; matching download and preview.')
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
for file in tracked:
    if file.startswith(('teaching/','docs/teaching/')):
        if re.search(r'\.(?:pptx?|pptm|ppsx?|ppsm|potx?|potm|odp)$',file,re.I):assert file in allowed,f'Unapproved presentation: {file}'
        assert not re.search(r'/(?:Drafts?|Book_Chap\d+)/',file),f'Private folder tracked: {file}'
print('Teaching presentation allowlist passed.')
