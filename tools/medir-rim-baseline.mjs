// Inventário local; não valida render, anatomia ou desempenho de interação.
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const measure = (path) => {
  const bytes = readFileSync(path);
  const row = { path, bytes: bytes.length, gzip9: gzipSync(bytes, { level: 9 }).length,
    sha256: createHash('sha256').update(bytes).digest('hex') };
  if (path.endsWith('.glb')) {
    const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    Object.assign(row, { asset: json.asset, images: json.images?.length ?? 0,
      nodes: json.nodes.map(n => n.name ?? null), meshes: json.meshes.length,
      materials: json.materials.map(m => ({ name: m.name,
        baseColor: m.pbrMetallicRoughness?.baseColorTexture ?? null,
        metallicRoughness: m.pbrMetallicRoughness?.metallicRoughnessTexture ?? null,
        normal: m.normalTexture ?? null, occlusion: m.occlusionTexture ?? null })) });
  }
  return row;
};
const runtime = ['kidney.js', 'vendor/three.module.min.js', 'vendor/three.core.min.js',
  'vendor/GLTFLoader.js', 'vendor/meshopt_decoder.module.js', 'utils/BufferGeometryUtils.js']
  .map(p => measure(`public/assets/${p}`));
const report = { date: '2026-09-18', scope: 'Ativo anterior; substituição bloqueada na aquisição',
  gzipMethod: 'gzip nível 9 por arquivo; não é transferência HTTP medida',
  runtime, runtimeGzip9: runtime.reduce((n, r) => n + r.gzip9, 0),
  original: measure('docs/amostra/assets/source/VH_F_Kidney_L.glb'),
  published: measure('public/assets/kidney.glb'),
  fallbacks: ['position', 'hilum'].map(v => measure(`public/assets/kidney-${v}.webp`)) };
report.total3dGzip9 = report.runtimeGzip9 + report.published.gzip9;
writeFileSync('docs/handoffs/cadencia-rim-baseline.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ runtimeGzip9: report.runtimeGzip9, glbGzip9: report.published.gzip9,
  texturesGzip9: 0, total3dGzip9: report.total3dGzip9 }));
