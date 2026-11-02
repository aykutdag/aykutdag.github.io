// Project data, grouped into colonies.
// GROUPS x / y place each colony on the opening field (0–1 of the screen width / height).
// Project x / y place the node once its colony is open. Texts are drafts: edit freely.
window.GROUPS = [
  { id: "practice", label: "Practice", note: "Architecture offices", x: 0.30, y: 0.56 },
  { id: "research", label: "Research", note: "Academic work", x: 0.70, y: 0.32 },
  { id: "media", label: "Installations and media", note: "Installations, exhibitions, video", x: 0.64, y: 0.74 }
];

window.PROJECTS = [
  // ---------- Practice ----------
  {
    group: "practice", glyph: "sejong",
    title: "SPARK: II. Sejong Center for Performing Arts",
    meta: "Seoul · 2023 · Competition finalist",
    place: "Seoul, South Korea", year: "2023",
    type: "International competition, shortlisted finalist (57,645 m²)",
    office: "Melike Altinisik Architects with BAUM Architects",
    role: "Competition team leader and creative media lead",
    text: "A performing arts center on the Han River at Yeouido Park, conceived as five fluid pavilions gathered around a civic plaza. Led the competition team through massing, auditorium volumes, area schedules, drawings and the jury presentation.",
    images: ["img/sejong-1.jpg", "img/sejong-2.jpg", "img/sejong-3.jpg", "img/sejong-4.jpg"],
    credit: "Renders by the MAA visualization team",
    x: 0.56, y: 0.26
  },
  {
    group: "practice", glyph: "libreville",
    title: "Libreville Arena & Convention Centre",
    meta: "Libreville · 2024 · Commission",
    place: "Libreville, Gabon", year: "2024",
    type: "Commission, concept design (65,000 m²)",
    office: "Melike Altinisik Architects with BAUM Architects",
    role: "Project team leader",
    text: "A mixed-use arena and convention centre within the Champ Triomphal master plan, meant to set Gabon up as a destination in Central Africa. Led the team through concept design, programmatic zoning, circulation and diagrams.",
    images: ["img/libreville-1.jpg", "img/libreville-2.jpg", "img/libreville-3.jpg"],
    x: 0.86, y: 0.38
  },
  {
    group: "practice", glyph: "banpo",
    title: "THE FLUX: Banpo Cultural Connection Park",
    meta: "Seoul · 2024 · Competition",
    place: "Seoul, South Korea", year: "2024",
    type: "International competition entry (26,000 m²)",
    office: "Melike Altinisik Architects with WITHWORKS",
    role: "Competition team member, intern team lead",
    text: "An elevated cultural park that bridges the Olympic Daero expressway and reconnects the Banpo neighbourhood with the Han River, with terraces, artist studios and a cultural facility centre. Concept design, diagrams and visualization.",
    images: ["img/banpo-1.jpg", "img/banpo-2.jpg", "img/banpo-3.jpg"],
    x: 0.22, y: 0.42
  },
  {
    group: "practice", glyph: "node",
    title: "THE NODE Archeopark",
    meta: "Incheon · 2023 · Competition",
    place: "Incheon, South Korea", year: "2023",
    type: "International competition entry (23,000 m²)",
    office: "Melike Altinisik Architects with WITHWORKS and MUSU Architects",
    role: "Competition team member, intern team lead",
    text: "A museum, library and cultural park in Geomdan beside a lake, wrapped in horizontal ribbons that recall layers of sediment. Concept design, diagrams and visualization.",
    images: ["img/node-1.jpg", "img/node-2.jpg", "img/node-3.jpg", "img/node-4.jpg"],
    x: 0.45, y: 0.50
  },
  {
    group: "practice", glyph: "nefbaku",
    title: "NEF Baku Residence",
    meta: "Baku · 2022 · Commission",
    place: "Baku, Azerbaijan", year: "2022",
    type: "Commission, 18-storey residential tower (23,000 m², 75 m)",
    office: "Melike Altinisik Architects",
    role: "Concept team leader",
    text: "A residential tower in Baku's Absheron district with an undulating balcony facade. Developed the unit layouts and area lists, produced the plans, sections and elevations, and led the intern team.",
    images: ["img/nefbaku-1.jpg", "img/nefbaku-2.jpg", "img/nefbaku-3.jpg"],
    credit: "Renders by the MAA visualization team",
    x: 0.70, y: 0.58
  },
  {
    group: "practice", glyph: "viridia",
    title: "Viridia Hotel",
    meta: "Kavaja · 2025 · Biophilic facade",
    place: "Kavaja, Albania", year: "2024–2025",
    type: "Commission, concept design (114,000 m², 140 m)",
    office: "GG-loop with FOCUS Architecture",
    role: "Architectural designer, facade design and visualization",
    text: "A biophilic resort tower on the Adriatic coast whose cascading terraces take after the scales and movement of the Balkan green lizard. Developed the facade concept and the parametric balcony geometry in Rhino and Grasshopper, and produced the renders.",
    images: ["img/viridia-1.jpg", "img/viridia-2.jpg", "img/viridia-3.jpg"],
    x: 0.84, y: 0.80
  },
  {
    group: "practice", glyph: "birdscape",
    title: "COA Hills Birdscape",
    meta: "Sakarya · 2024 · Bio-computation",
    place: "Sakarya, Turkey", year: "2024",
    type: "Research project, landscape micro-habitats",
    office: "Melike Altinisik Architects",
    role: "Team leader",
    text: "Nesting shelters and landscape units for endemic bird species, generated from bird-song frequencies with Marching Cubes in Grasshopper and cast as physical prototypes.",
    images: ["img/birdscape-1.jpg", "img/birdscape-2.jpg", "img/birdscape-3.jpg", "img/birdscape-4.jpg"],
    x: 0.16, y: 0.74
  },
  {
    group: "practice", glyph: "kadikoy",
    title: "IN SITU: Kadıköy Square",
    meta: "Istanbul · 2020 · 1st Prize",
    place: "Kadıköy, Istanbul", year: "2020 (under construction)",
    type: "Urban design competition, 1st Prize (325,685 m²)",
    office: "Aboutblank with Adapt Architects",
    role: "Competition team member",
    text: "Reclaims one of Istanbul's busiest transit hubs as a public waterfront at human scale, drawing on the traces of the square's urban memory. Concept design, 3D modelling, diagrams and visualization.",
    images: ["img/kadikoy-1.jpg", "img/kadikoy-2.jpg", "img/kadikoy-3.jpg"],
    x: 0.46, y: 0.82
  },

  // ---------- Research ----------
  {
    group: "research", glyph: "thesis",
    title: "Immaterial Architectural Space",
    meta: "İTÜ · 2025– · M.Sc. thesis",
    place: "Istanbul Technical University", year: "2025–",
    type: "M.Sc. thesis, research through design",
    office: "Architectural Design Computing, İTÜ",
    role: "Researcher (advisor: Assoc. Prof. Dr. Sevil Yazıcı)",
    text: "A bio-inspired pneumatic modular system based on alveolar structures and Murray's Law, prototyped with cast platinum-cure silicone and 3D-printed TPU constraint networks.",
    x: 0.30, y: 0.50
  },
  {
    group: "research", glyph: "stylegan",
    title: "Physarum × StyleGAN",
    meta: "İTÜ · Machine learning",
    place: "Istanbul Technical University", year: "",
    type: "Research, machine learning",
    office: "Architectural Design Computing, İTÜ",
    role: "Researcher",
    text: "StyleGAN models trained to blend historic urban morphology with the growth patterns of the slime mold Physarum polycephalum, as a generator for emergent urban layouts. The network on this page runs on the same organism's logic.",
    x: 0.64, y: 0.36
  },
  {
    group: "research", glyph: "concrete",
    title: "Concrete Flowers",
    meta: "İTÜ · Fabric formwork",
    place: "Istanbul Technical University", year: "",
    type: "Research, digital fabrication",
    office: "Digital Architectural Design and Modelling, İTÜ",
    role: "Designer",
    text: "A deployable mold system combining parametric modelling, 3D-printed articulated frames and flexible fabric membranes to cast variable concrete panels.",
    x: 0.54, y: 0.72
  },

  // ---------- Installations and media ----------
  {
    group: "media", glyph: "khora",
    title: "[KHORA]: Space of Becoming",
    meta: "AKM Istanbul · 2026 · Installation",
    place: "Atatürk Kültür Merkezi (AKM), Istanbul", year: "2026",
    type: "Neuro-responsive installation, Istanbul Digital Art Festival",
    office: "KHORA Collective: Betül Uçkan, Ayçin Atukeren, Aykut Dağ, Bengü Özmutlu, Tolga Aydoğdu, Umut Pektetik",
    role: "Spatial and generative designer",
    text: "Real-time EEG and heart-rate data reshape projection on semi-transparent membranes and the spatial sound around the visitor, turning the room into a feedback loop with the body and mind.",
    images: ["img/khora-1.jpg", "img/khora-2.jpg", "img/khora-3.jpg"],
    x: 0.28, y: 0.50
  },
  {
    group: "media", glyph: "vortex",
    title: "THE VORTEX",
    meta: "Germany · 2024 · Installation",
    place: "Germany", year: "2024",
    type: "Audio-reactive spatial installation, Feltouch",
    office: "Feltouch, with Bengü Özmutlu and team",
    role: "Team member",
    text: "Water droplets make ripples whose vibration data turns into real-time light and particle projections, so water, light and sound behave as one responsive system.",
    images: ["img/vortex-1.jpg", "img/vortex-2.jpg", "img/vortex-3.jpg"],
    x: 0.62, y: 0.30
  },
  {
    group: "media", glyph: "basilica",
    title: "Basilica of Saint Neophytos",
    meta: "İznik · Digital installation",
    place: "Lake İznik, Turkey", year: "",
    type: "Independent research and digital installation",
    office: "Independent",
    role: "Author",
    text: "The submerged basilica on the shore of Lake İznik, read through data-driven modelling and algorithmic visualization of its historical phases, and proposed as an immersive exhibition.",
    images: ["img/basilica-1.jpg", "img/basilica-2.jpg"],
    x: 0.80, y: 0.62
  },
  {
    group: "media", glyph: "cobond",
    title: "[Co]BOND",
    meta: "Tønsberg · 2025 · Proposal",
    place: "Tønsberg, Norway", year: "2025",
    type: "Interactive installation proposal",
    office: "With Bengü Özmutlu and Ayşegül Akçay Kavakoğlu",
    role: "Designer",
    text: "Visitors become agents whose movements steer digital baleen whales (camera tracking and the Whale Optimization Algorithm), projected on tulle: Tønsberg's whaling past reimagined as coexistence.",
    images: ["img/cobond-1.jpg", "img/cobond-2.jpg", "img/cobond-3.jpg"],
    x: 0.44, y: 0.80
  }
];

window.ABOUT = {
  text: [
    "Architectural and computational designer with 4+ years of experience in international competitions and concept design for cultural, hospitality and office buildings.",
    "I work with parametric design in Rhino and Grasshopper, interactive systems in TouchDesigner, generative AI and hands-on digital fabrication, with a particular interest in biophilic and bio-inspired design.",
    "Currently an M.Sc. candidate in Architectural Design Computing at Istanbul Technical University, researching pneumatic systems and soft robotics."
  ]
};

window.CONTACT = [
  { label: "aaykutdag@gmail.com", href: "mailto:aaykutdag@gmail.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/aykut-da%C4%9F/" },
  { label: "Behance", href: "https://www.behance.net/aykutdag" }
];
