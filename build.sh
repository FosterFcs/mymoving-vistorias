#!/usr/bin/env bash
# Junta os fontes em src/ num único index.html (padrão single-file)
set -e; cd "$(dirname "$0")"
python3 - <<'PY'
s = open('src/shell.html', encoding='utf-8').read()
js = '\n'.join(open(f'src/{n}', encoding='utf-8').read() for n in ['core.js','views1.js','views2.js','views3.js'])
open('index.html','w',encoding='utf-8').write(s.replace('<!--APP-->', '<script>\n'+js+'\n</script>'))
print('index.html gerado:', len(s)+len(js), 'bytes')
PY
