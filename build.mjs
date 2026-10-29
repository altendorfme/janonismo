import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const RAIZ = import.meta.dirname;
const SRC = join(RAIZ, 'src');
const DIST = join(RAIZ, 'dist');

const base = JSON.parse(readFileSync(join(SRC, 'manifest.base.json'), 'utf8'));
base.web_accessible_resources[0].matches = base.content_scripts.flatMap((cs) => cs.matches);

const versao = process.env.VERSAO?.replace(/^v/, '');
if (versao) {
  if (!/^\d+(\.\d+){0,3}$/.test(versao)) throw new Error(`VERSAO inválida: ${versao}`);
  base.version = versao;
}

const alvos = {
  chrome: {
    ...base,
    background: { service_worker: 'background.js' },
  },
  firefox: {
    ...base,
    background: { scripts: ['shared/plataformas.js', 'shared/lista.js', 'background.js'] },
    browser_specific_settings: {
      gecko: {
        id: 'janonismo@extensao',
        strict_min_version: '142.0',
        data_collection_permissions: { required: ['none'] },
      },
      gecko_android: {
        strict_min_version: '142.0',
      },
    },
  },
};

if (!existsSync(join(SRC, 'assets', 'janones.gif'))) {
  console.warn('⚠  src/assets/janones.gif não existe — o overlay vai usar o placeholder.svg.');
}

rmSync(DIST, { recursive: true, force: true });
for (const [nome, manifest] of Object.entries(alvos)) {
  const destino = join(DIST, nome);
  mkdirSync(destino, { recursive: true });
  cpSync(SRC, destino, { recursive: true, filter: (p) => !p.endsWith('manifest.base.json') });
  writeFileSync(join(destino, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(DIST, `janonismo-${nome}-${manifest.version}.zip`), zipar(destino));
  console.log(`✔ dist/${nome}`);
}

function listar(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? listar(p) : [p];
  });
}

function zipar(dir) {
  const locais = [];
  const centrais = [];
  let offset = 0;
  for (const arquivo of listar(dir)) {
    const nome = Buffer.from(relative(dir, arquivo).split(sep).join('/'));
    const dados = readFileSync(arquivo);
    const comprimido = deflateRawSync(dados);
    const crc = crc32(dados);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nome.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nome.length, 28);
    central.writeUInt32LE(offset, 42);

    locais.push(local, nome, comprimido);
    centrais.push(central, nome);
    offset += local.length + nome.length + comprimido.length;
  }
  const tamanhoCentral = centrais.reduce((s, b) => s + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(centrais.length / 2, 8);
  fim.writeUInt16LE(centrais.length / 2, 10);
  fim.writeUInt32LE(tamanhoCentral, 12);
  fim.writeUInt32LE(offset, 16);
  return Buffer.concat([...locais, ...centrais, fim]);
}
