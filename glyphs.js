// One-line diagrams for each project, drawn on a 48 × 48 grid (stroke only, no fill).
// Each glyph abstracts the project's key diagram; replace freely with your own.
window.GLYPHS = {
  // Auditorium seating fan and stage
  sejong: '<path d="M8 32A16 16 0 0 1 40 32"/><path d="M13 32A11 11 0 0 1 35 32"/><path d="M18 32A6 6 0 0 1 30 32"/><path d="M16 38H32"/>',
  // Arena bowl with access axis
  libreville: '<ellipse cx="24" cy="24" rx="19" ry="12"/><ellipse cx="24" cy="24" rx="10" ry="5"/><path d="M5 24H14M34 24H43"/>',
  // Elevated park deck over the expressway
  banpo: '<path d="M4 36H44M4 41H44"/><path d="M4 25C13 17 19 29 27 21S39 15 44 19"/><path d="M15 23V36M31 20V36"/>',
  // Sediment ribbons wrapping the volume
  node: '<path d="M11 15Q24 10 37 15"/><path d="M7 22Q24 17 41 22"/><path d="M7 29Q24 24 41 29"/><path d="M11 36Q24 31 37 36"/>',
  // Tower with undulating balconies on a podium
  nefbaku: '<path d="M18 42V8H30"/><path d="M30 8Q35 12 30 16Q35 20 30 24Q35 28 30 32Q35 36 30 40V42"/><path d="M7 42H41"/>',
  // Cascading balcony waves
  viridia: '<path d="M18 6V42M30 6V42"/><path d="M13 12C17 9 20 15 24 12S31 9 35 12"/><path d="M13 20C17 23 20 17 24 20S31 23 35 20"/><path d="M13 28C17 25 20 31 24 28S31 25 35 28"/><path d="M13 36C17 39 20 33 24 36S31 39 35 36"/>',
  // Bird song becoming a nesting form
  birdscape: '<path d="M4 24Q7 14 10 24T16 24T22 24"/><path d="M27 24C27 14 44 13 44 24C44 35 27 34 27 24Z"/><circle cx="36" cy="24" r="3"/>',
  // Square and the flows crossing it
  kadikoy: '<rect x="9" y="9" width="30" height="30"/><path d="M4 31C16 31 22 19 44 17"/><path d="M15 44C17 31 29 22 31 4"/>',
  // Murray's-law branching ending in alveoli
  thesis: '<path d="M24 44V32M24 32L15 23M24 32L33 23M15 23L11 16M15 23L19 16M33 23L29 16M33 23L37 16"/><circle cx="11" cy="12.5" r="3.5"/><circle cx="19" cy="12.5" r="3.5"/><circle cx="29" cy="12.5" r="3.5"/><circle cx="37" cy="12.5" r="3.5"/>',
  // Urban grid turning into a slime-mold network
  stylegan: '<circle cx="7" cy="16" r="1"/><circle cx="14" cy="16" r="1"/><circle cx="21" cy="16" r="1"/><circle cx="7" cy="24" r="1"/><circle cx="14" cy="24" r="1"/><circle cx="21" cy="24" r="1"/><circle cx="7" cy="32" r="1"/><circle cx="14" cy="32" r="1"/><circle cx="21" cy="32" r="1"/><path d="M27 14L35 20L44 13M35 20L33 30L42 37M33 30L26 35"/>',
  // Fabric membrane sagging in a frame
  concrete: '<path d="M6 12H42M6 12V7M42 12V7"/><path d="M6 12Q24 42 42 12"/><path d="M13 12Q24 31 35 12"/>',
  // EEG trace running through a room
  khora: '<rect x="6" y="10" width="36" height="28" rx="1"/><path d="M6 26H13L15 19L18 32L21 15L24 29L26 24H42"/>',
  // Basilica plan with a play mark
  basilica: '<path d="M6 16H32A8 8 0 0 1 32 32H6Z"/><path d="M17 20L25 24L17 28Z"/>',
  // Whale bubble-net spiral and an agent
  cobond: '<path d="M24 24A3 3 0 0 1 27 27A6 6 0 0 1 21 33A9 9 0 0 1 15 21A12 12 0 0 1 33 15A15 15 0 0 1 39 39"/><circle cx="39" cy="39" r="2"/>'
};

window.glyphSVG = function (key) {
  return '<svg class="glyph" viewBox="0 0 48 48" aria-hidden="true">' + (window.GLYPHS[key] || '<circle cx="24" cy="24" r="6"/>') + '</svg>';
};
