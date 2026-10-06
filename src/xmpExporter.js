const XMP = 'http://ns.adobe.com/xap/1.0/';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
function selection(rating, label) {
  if (!Number.isInteger(rating ?? 0) || (rating ?? 0) < 0 || (rating ?? 0) > 5) throw new Error('Rating must be between 0 and 5.');
  if (!['', 'red', 'yellow', 'green', 'blue', 'purple'].includes(label || '')) throw new Error('Unsupported color label.');
  return { rating: rating ?? 0, label: label ? label[0].toUpperCase() + label.slice(1) : '' };
}
export function generateXmpContent(rating, label) {
  const value = selection(rating, label);
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="${RDF}"><rdf:Description rdf:about="" xmlns:xmp="${XMP}" xmp:Rating="${value.rating}" xmp:Label="${value.label}"/></rdf:RDF></x:xmpmeta>\n<?xpacket end="w"?>`;
}
export function mergeXmpContent(existing, rating, label) {
  const value = selection(rating, label);
  if (existing.length > 10 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(existing)) throw new Error('Unsupported XMP document. Existing metadata was preserved.');
  const xml = new DOMParser().parseFromString(existing, 'application/xml');
  const descriptions = [...xml.getElementsByTagNameNS(RDF, 'Description')];
  if (xml.getElementsByTagName('parsererror').length || !descriptions.length) throw new Error('Invalid existing XMP. Existing metadata was preserved.');
  for (const description of descriptions) {
    description.removeAttributeNS(XMP, 'Rating'); description.removeAttributeNS(XMP, 'Label');
    for (const node of [...description.children]) if (node.namespaceURI === XMP && ['Rating', 'Label'].includes(node.localName)) node.remove();
  }
  descriptions[0].setAttributeNS(XMP, 'xmp:Rating', String(value.rating));
  descriptions[0].setAttributeNS(XMP, 'xmp:Label', value.label);
  return new XMLSerializer().serializeToString(xml);
}
export async function exportXmpSidecars(outputHandle, culledImages, addLog) {
  if (!outputHandle) throw new Error('Choose an output folder first.');
  const groups = new Map();
  for (const image of culledImages) {
    const base = image.name.replace(/\.[^.]+$/, '');
    const key = base.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name: `${base}.xmp`, images: [] });
    groups.get(key).images.push(image);
  }
  const result = { saved: 0, failed: 0 };
  for (const { name, images } of groups.values()) {
    try {
      const first = selection(images[0].rating, images[0].label);
      if (images.some(image => JSON.stringify(selection(image.rating, image.label)) !== JSON.stringify(first))) throw new Error('RAW/JPEG files sharing this name have conflicting ratings. Choose the same rating before export.');
      let handle, original;
      try { handle = await outputHandle.getFileHandle(name); original = await handle.getFile(); }
      catch (error) { if (error.name !== 'NotFoundError') throw error; }
      const data = original ? mergeXmpContent(await original.text(), images[0].rating, images[0].label) : generateXmpContent(images[0].rating, images[0].label);
      if (!handle) handle = await outputHandle.getFileHandle(name, { create: true });
      if (original && !handle.photoLabNative) {
        const backup = await outputHandle.getFileHandle(`${name}.${crypto.randomUUID()}.bak`, { create: true });
        const stream = await backup.createWritable(); await stream.write(original); await stream.close();
        const latest = await handle.getFile();
        if (await latest.text() !== await original.text()) throw new Error('XMP changed while saving. Retry after reviewing it.');
      }
      const stream = await handle.createWritable({ mergeXmp: Boolean(original) });
      await stream.write(data); await stream.close(); result.saved++;
    } catch (error) { result.failed++; addLog?.(`${name}: ${error.message}`, 'warning'); }
  }
  addLog?.(`XMP sidecars: ${result.saved} saved, ${result.failed} failed. Existing metadata is backed up before updates.`, result.failed ? 'warning' : 'success');
  return result;
}
