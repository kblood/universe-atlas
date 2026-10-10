/** Capture once before bookmark/navigation normalization discards diagnostic keys.
 * XR isolation remains owned by PlanetRenderer's lazy desktop provider gate. */
export function faunaPresentationOptions(search:string){
  const query=new URLSearchParams(search),requested=query.get('fauna-lod-prototype');
  return Object.freeze({lodMode:requested==='off'||requested==='0'?'off':requested==='packed'?'packed':'float',
    bodyPresentation:query.get('fauna-body')==='legacy-v4'?'legacy-v4':'sculpted-v1',
    forestBarkSharing:query.get('forest-bark-sharing')!=='0',
    profile:query.get('fauna-lod-profile')==='1',
    paletteUploadMode:query.get('fauna-lod-upload')==='rows'?'adaptive-rows':'full'} as const);
}
