from pathlib import Path
import re,hashlib,base64,zipfile,shutil
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist';DIST.mkdir(exist_ok=True)
source=(ROOT/'index.html').read_text()
for name in ['zip.js','model.js','xlsx.js','pptx-template.js','reports.js','app.js']:
    assert (ROOT/'src'/name).exists(),name
# Hosted GitHub Pages build: source is already static; mirror the same entry and assets.
shutil.copy2(ROOT/'index.html',DIST/'index.html')
shutil.copytree(ROOT/'src',DIST/'src',dirs_exist_ok=True,ignore=shutil.ignore_patterns('assets'))
(DIST/'.nojekyll').write_text('')
(DIST/'CNAME').write_text('raid.mightora.io\n')
# Offline variant: inline first-party code/style and remove all remote resource references.
html=source.replace('data-offline="false"','data-offline="true"')
html=re.sub(r'<link rel="stylesheet" href="https://cdn\.jsdelivr\.net/gh/mightora/shared-ui@main/shared\.css"\s*/>','',html)
html=re.sub(r'<script>\s*\(function\(\)\{const original=window\.fetch;.*?</script>','',html,flags=re.S)
html=re.sub(r'<script defer src="https://cdn\.jsdelivr\.net/.*?</script>','',html)
style=(ROOT/'src/styles.css').read_text()+'\n.offline-logo{font-size:23px;font-weight:950;letter-spacing:.08em;color:#173a52}.local-header .brand{min-height:45px}.local-header .brand-name{margin-left:4px}\n'
html=html.replace('<link rel="stylesheet" href="src/styles.css"/>','<style>'+style+'</style>')
logo=ROOT/'src/assets/mightora-logo.png'
if logo.exists():
    logo_data='data:image/png;base64,'+base64.b64encode(logo.read_bytes()).decode('ascii')
    html=html.replace('https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png',logo_data)
else:
    # Never give a false sense of perfect offline branding in a source-only checkout.
    html=re.sub(r'<img alt="Mightora" src="https://raw\.githubusercontent\.com/mightora/mightora\.io/main/static/images/mightoraIoLogo4-200x900\.png"\s*/>','<span class="offline-logo">MIGHTORA</span>',html)
# Offline biography uses an initials fallback instead of external requests.
html=re.sub(r'<img src="https://techtweedie\.github\.io[^"]+"[^>]+/>', '<span class="author-initials">IT</span>', html)
html=re.sub(r'<img src="https://raw\.githubusercontent\.com/TechTweedie[^"]+"[^>]+/>', '', html)
# Omit online-only badge SVG requests from fully offline edition.
html=re.sub(r'<img class="proof-img"[^>]*>','',html)
html=re.sub(r'<a class="button secondary offline-download" href="raaidd-offline.zip" download>.*?</a>','<span class="tag neutral">Offline edition active</span>',html)
html=re.sub(r'<a href="raaidd-offline.html" download>Standalone offline HTML ↓</a>\s*&nbsp; · &nbsp;','',html)
# Custom-elements header refers to logo URL as a dormant attribute in the offline edition; remove it from attributes.
html=html.replace('logo-light="https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png"','logo-light=""').replace('logo-dark="https://raw.githubusercontent.com/mightora/mightora.io/main/static/images/mightoraIoLogo4-200x900.png"','logo-dark=""')
parts=[]
for name in ['zip.js','model.js','xlsx.js','pptx-template.js','reports.js','app.js']:
    parts.append((ROOT/'src'/name).read_text())
js='\n;\n'.join(parts)
html=re.sub(r'<script src="src/zip\.js"></script>.*?<script src="src/app\.js"></script>',lambda m:'<script>'+js+'</script>',html,flags=re.S)
assert 'src="src/' not in html, 'Unbundled local resource'
assert 'href="src/' not in html, 'Unbundled style resource'
# Inline hashes allow strict no-network CSP without unsafe-inline.
css_hash=base64.b64encode(hashlib.sha256(style.encode()).digest()).decode()
js_hash=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode()
meta=f'<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'sha256-{js_hash}\'; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'; font-src \'none\'; object-src \'none\'; frame-src \'none\'; base-uri \'none\'; form-action \'none\'"/>'
html=html.replace('<meta charset="utf-8"/>','<meta charset="utf-8"/>\n'+meta)
assert 'cdn.jsdelivr.net' not in html
assert 'https://techtweedie.github.io/images/author' not in html
(DIST/'raaidd-offline.html').write_text(html)
with zipfile.ZipFile(DIST/'raaidd-offline.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
    z.write(DIST/'raaidd-offline.html','index.html')
    z.write(ROOT/'README.md','README.md')
    z.write(ROOT/'LICENSE','LICENSE')
# Note: packaged offline HTML named index.html inside ZIP for double-clicking.
print('Hosted files:',(DIST/'index.html').stat().st_size,'bytes')
print('Offline HTML:',(DIST/'raaidd-offline.html').stat().st_size,'bytes; ZIP:',(DIST/'raaidd-offline.zip').stat().st_size,'bytes')