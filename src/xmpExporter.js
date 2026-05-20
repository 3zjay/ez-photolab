/**
 * XMP sidecar generator and exporter for EZ-PhotoLab
 * Exports Adobe/Lightroom-compatible ratings & color labels locally.
 */

/**
 * Returns a standard Adobe-compliant XMP sidecar XML template.
 * @param {number} rating - Star rating (0 to 5)
 * @param {string} label - Color label (e.g., 'green', 'blue', 'red', 'yellow')
 */
export function generateXmpContent(rating, label) {
  const ratingVal = rating || 0;
  const labelName = label ? label.charAt(0).toUpperCase() + label.slice(1) : "";

  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:42:16">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpDM="http://ns.adobe.com/xmp/1.0/DynamicMedia/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmp:Rating="${ratingVal}"
    xmp:Label="${labelName}">
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Writes XMP sidecar files directly to the chosen local directory.
 * @param {FileSystemDirectoryHandle} outputHandle - File System handle of the output folder
 * @param {Array} culledImages - List of `{ name, rating, label }`
 * @param {Function} addLog - Log callback
 */
export async function exportXmpSidecars(outputHandle, culledImages, addLog) {
  if (!outputHandle) {
    throw new Error("No output directory selected");
  }

  addLog?.(`📂 Storing XMP sidecars to selected folder...`, "info");

  let count = 0;
  for (const img of culledImages) {
    if (!img.rating && !img.label) continue; // Skip unrated items to save disk space

    // Extract base name (filename without extension, e.g. "DSC_1024.NEF" -> "DSC_1024")
    const baseName = img.name.substring(0, img.name.lastIndexOf('.')) || img.name;
    const xmpName = `${baseName}.xmp`;

    try {
      // Create new XMP file in directory
      const fileRef = await outputHandle.getFileHandle(xmpName, { create: true });
      const writable = await fileRef.createWritable();
      
      const xmlString = generateXmpContent(img.rating, img.label);
      await writable.write(xmlString);
      await writable.close();

      count++;
    } catch (e) {
      addLog?.(`⚠️ Failed to write ${xmpName}: ${e.message}`, "warning");
      console.error(`XMP Export Error for ${xmpName}:`, e);
    }
  }

  addLog?.(`✅ Successfully exported ${count} XMP sidecar files.`, "success");
  return count;
}
