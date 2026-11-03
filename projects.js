// Project data, grouped into colonies.
// GROUPS x / y place each colony on the opening field (0–1 of the screen width / height).
// Project x / y place the node once its colony is open.
// Practice texts and credits follow Aykut_Dag_Portfolio.pdf; installations follow
// AykutDag_MediaPortfolio.pdf; research projects summarize the course reports.
// credits: [label, value] rows of the project's credit block. short: the node label on phones.
// text: paragraphs. duties: responsibilities. video: YouTube id.
// film: a video hosted with the site { src, poster, portrait }. links: [{ label, href, icon }].
// slug: the project's address (aykutdag.github.io/projects/<slug>/); keep it once published,
// links to it may be shared. featured: shown under Selected Work.
window.GROUPS = [
  { id: "practice", label: "Practice", note: "Architecture offices", x: 0.30, y: 0.56 },
  { id: "research", label: "Research", note: "Academic work", x: 0.70, y: 0.32 },
  { id: "media", label: "Installations and media", note: "Installations, exhibitions, video", x: 0.64, y: 0.74 }
];

window.PROJECTS = [
  // ---------- Practice ----------
  {
    group: "practice", glyph: "sejong", slug: "spark-sejong", featured: true,
    title: "SPARK | II. Sejong Cultural Center for Performing Arts",
    short: "SPARK",
    meta: "Seoul · 2023–2025 · Shortlisted finalist",
    text: [
      "The urban design approach for THE SPARK, the 2nd Sejong Center for Performing Arts, is focused on creating a cultural complex that becomes a landmark in the heart of the city, blending nature and culture into a harmonious space for the community. Located at the corner of Yeouido Park, surrounded by the Han River on the north-east side and connecting waterside public activities towards the south-west, THE SPARK aims to preserve the existing ecosystem while providing an area for urban cultural events next to Seoul’s international financial center."
    ],
    credits: [
      ["Project", "II. Sejong Cultural Center for Performing Arts"],
      ["Location", "Seoul, South Korea"],
      ["Date", "2023–2025"],
      ["Client", "Seoul Metropolitan Government"],
      ["Status", "International Competition, Shortlisted Finalist"],
      ["Size", "57,645 m²"],
      ["Architect", "Melike Altınışık Architects + BAUM Architects"],
      ["Landscape architect", "ALIVEUS Landscape"],
      ["Project team leader (competition stage)", "Aykut Dağ"],
      ["Project team (competition stage)", "Atakan Gündüz, Adham Mashaal"],
      ["Architectural assistant team", "Doğukan Cengiz, Anya Ghosh, Tolunay Demir, Samet Yılmaz"],
      ["Creative media lead", "Aykut Dağ"],
      ["Media assistant team", "Alper Fatih Tepe, Elif Yalçın, Samet Yılmaz, Yağmur Ayaydın"]
    ],
    duties: ["Team leading", "Concept design development", "Architectural layouts, space organizations", "Managing area lists", "2D drawings (plan, section, elevation)", "Contributed to diagram production", "Visualization", "Architectural model photography & videography"],
    links: [{ label: "Project page at Melike Altınışık Architects", href: "https://www.melikealtinisik.com/2-index/3549-iisejong-cultural-center-for-performing-arts/", icon: "external" }],
    images: ["img/sejong-1.jpg", "img/sejong-2.jpg", "img/sejong-3.jpg", "img/sejong-4.jpg"],
    credit: "2D drawings by Aykut Dağ · renders by MAA",
    x: 0.56, y: 0.26
  },
  {
    group: "practice", glyph: "libreville", slug: "libreville-arena",
    title: "Libreville Arena & Convention Centre",
    short: "Libreville Arena",
    meta: "Libreville · 2024 · Commission",
    text: [
      "The Libreville Arena & Convention Centre, located within the Champ Triomphal Masterplan in Libreville, Gabon, aims to establish a mixed-use center that serves as a catalyst for advancing and promoting Gabon as a major attraction in Central Africa.",
      "The architectural design concept focuses on creating high-quality architectural and urban environments with an eco-responsible approach. The center is designed to blend the local and visitor communities of all generations in harmony across two distinct zones: the Convention Zone and the Accommodation Zone."
    ],
    credits: [
      ["Project", "Libreville Arena & Convention Centre"],
      ["Location", "Libreville, Gabon"],
      ["Date", "2024"],
      ["Client", "FB Group"],
      ["Status", "Commission"],
      ["Size", "65,000 m²"],
      ["Architect", "Melike Altınışık Architects + BAUM Architects"],
      ["Design architect", "Melike Altınışık Architects"],
      ["Landscape architect", "ALIVEUS Landscape"],
      ["Project team leader (competition stage)", "Aykut Dağ"],
      ["Project team (competition stage)", "Adham Mashaal, Mamdouh Barakat, Atakan Gündüz"],
      ["Architectural assistant team", "Onkar Pal, Rabia Maral"]
    ],
    duties: ["Team leading", "Concept design development", "Contributed to diagram production", "Visualization"],
    links: [{ label: "Project page at Melike Altınışık Architects", href: "https://www.melikealtinisik.com/2-index/3645-libreville-arena-convention-center/", icon: "external" }],
    images: ["img/libreville-1.jpg", "img/libreville-2.jpg", "img/libreville-3.jpg"],
    x: 0.86, y: 0.38
  },
  {
    group: "practice", glyph: "banpo", slug: "the-flux-banpo",
    title: "THE FLUX | Banpo Cultural Connection Park",
    short: "THE FLUX",
    meta: "Seoul · 2024 · Competition entry",
    text: [
      "The urban design vision for THE FLUX, the Banpo-Hangang River Connection Park and Cultural Facilities, revolves around crafting an elevated Cultural Park that stands out as a landmark in the city center. This park seamlessly integrates nature, culture, and urban life to form a cohesive space for the community.",
      "It is located on an expressway, surrounded by the Hangang River on the north, Banpo Jugong Apartment Complex on the west and Acro River Park Apartment Complex on the east and connecting public activities towards Shinbanpo-ro on the south.",
      "The design strategy emphasizes preserving the existing ecosystem and acknowledging the historical evolution of housing while providing a venue for urban cultural events. The elevated park, floating above the expressway, features vertical connection points to access the Hangang River."
    ],
    credits: [
      ["Project", "BANPO Cultural Connection Park"],
      ["Location", "Seoul, South Korea"],
      ["Date", "2024"],
      ["Client", "Seoul Metropolitan Government"],
      ["Status", "International Competition, Entry"],
      ["Size", "26,000 m²"],
      ["Architect", "Melike Altınışık Architects + WITHWORKS"],
      ["Design architect", "Melike Altınışık Architects"],
      ["Landscape architect", "ALIVEUS Landscape"],
      ["Project team (competition stage)", "Ayça Yontarım, Batuhan Güllü, Aykut Dağ, Atakan Gündüz, Mamdouh Barakat, Adham Mashaal"],
      ["Architectural assistant team", "Onkar Pal, Elif Yalçın"]
    ],
    duties: ["Leading interns", "Concept design development", "Contributed to diagram production", "Visualization"],
    links: [{ label: "Project page at Melike Altınışık Architects", href: "https://www.melikealtinisik.com/2-index/3608-banpo-cultural-connection-park/", icon: "external" }],
    images: ["img/banpo-1.jpg", "img/banpo-2.jpg", "img/banpo-3.jpg"],
    x: 0.22, y: 0.42
  },
  {
    group: "practice", glyph: "node", slug: "the-node-archeopark",
    title: "THE NODE | Archeopark",
    short: "THE NODE",
    meta: "Incheon · 2023 · Competition entry",
    text: [
      "Our spatial response to the design for Incheon Geomdan Museum Library Cultural Complex (IGMLCC) aims to create a cultural complex for the visitors and public where history and nature are the main subjects of THE NODE Archeopark.",
      "THE NODE Archeopark will play a catalytic role as a base for the community in Geomdan New Town in Incheon. It will preserve social and cultural background with sustainable architectural vision while becoming an Archeopark as an active learning center where it won’t only become a place for symbol but also it will let the citizens to become owners of public spaces.",
      "This unique cultural complex located at the corner of the Park No.14 is surrounded with a central lake on a wide area with green axis from north to south and developed as an open space to accommodate urban cultural events. It is an area that requires harmony with the natural environment and a plan to preserve the existing ecosystem in which the nature and architecture meet.",
      "It has a harmonized design approach in between landscape, waterscape, culturalscape, archeoscape and cityscape. The Eco-Bridges connecting the Park No.13 and Park No.15 with Park No.14 also became a design tool for a sustainable environmental role of the Cultural Complex."
    ],
    credits: [
      ["Project", "THE NODE Archeopark"],
      ["Location", "Incheon, South Korea"],
      ["Date", "2023"],
      ["Client", "Incheon Metropolitan Government"],
      ["Status", "International Competition, Entry"],
      ["Size", "23,000 m²"],
      ["Architect", "Melike Altınışık Architects (MAA) + WITHWORKS (WW) + MUSU Architects"],
      ["Design architect", "Melike Altınışık Architects"],
      ["Project team (competition stage)", "Aykut Dağ, Atakan Gündüz, Adham Mashaal, Elifcan Merdan"],
      ["Architectural assistant team", "Muskaan Chowdhary, Anya Ghosh, Faizan Sharief"]
    ],
    duties: ["Leading interns", "Concept design development", "Contributed to diagram production", "Visualization"],
    images: ["img/node-1.jpg", "img/node-2.jpg", "img/node-3.jpg", "img/node-4.jpg"],
    x: 0.45, y: 0.50
  },
  {
    group: "practice", glyph: "nefbaku", slug: "nef-baku",
    title: "NEF BAKU Residence",
    short: "NEF Baku",
    meta: "Baku · 2022 · Commission",
    text: [
      "The proposed 18-storey NEF BAKU Residence, located in the rapidly evolving Baku Absheron district, is designed to reflect the distinctive character of its neighborhood while establishing harmony with its architectural presence across the entire district. This 75-meter-high residence tower aims to provide a vibrant addition to the district.",
      "The architectural concept focuses on creating high-quality architectural and urban environments with an eco-responsible approach, distinguishing itself from nearby towers in Baku’s skyline. With multiple balconies facing the sea, most residences enjoy unique natural scenery. The building’s massing allows for a generous public podium and includes a community center offering space for temporary events, welcoming both residents and visitors.",
      "The 60-unit residential tower in the heart of Baku sets a precedent by offering a wide range of flat types to accommodate different contemporary family configurations. Amenities at NEF BAKU Residence include a wellness level with a spa, pool, sunken courtyard, and entertainment suite with a cinema."
    ],
    credits: [
      ["Project", "NEF BAKU Residence"],
      ["Location", "Baku, Azerbaijan"],
      ["Date", "2022"],
      ["Client", "NEF Global"],
      ["Status", "Commission"],
      ["Size", "23,000 m² / 75 m"],
      ["Architect", "Melike Altınışık Architects"],
      ["Project team (competition stage)", "Aykut Dağ, Elifcan Merdan, Adham Mashaal"],
      ["Architectural assistant team", "Kutay Koçtekin, Abdullah Aydemir, Abdullah Mallah"]
    ],
    duties: ["Intern team leading", "Concept design development", "Architectural layouts, space organizations", "Managing area lists", "2D drawings (plan, section, elevation)", "Contributed to diagram production", "Visualization"],
    links: [{ label: "Project page at Melike Altınışık Architects", href: "https://www.melikealtinisik.com/2-index/3681-nef-baku-residence/", icon: "external" }],
    images: ["img/nefbaku-1.jpg", "img/nefbaku-2.jpg", "img/nefbaku-3.jpg"],
    credit: "Renders by MAA",
    x: 0.70, y: 0.58
  },
  {
    group: "practice", glyph: "viridia", slug: "viridia-hotel",
    title: "Viridia Hotel Building",
    short: "Viridia Hotel",
    meta: "Kavaja · 2025 · Commission",
    text: [
      "Located in a dynamic urban setting, this residential tower seamlessly integrates city life with nature, drawing inspiration from the Balkan Green Lizard (Lacerta trilineata). Known for its adaptability and vibrant presence in the region’s landscapes, the lizard embodies the harmony between movement and environment—qualities reflected in the building’s design.",
      "The architectural form mimics the layered scales and fluid motion of the lizard, with cascading terraces that create a rhythmic, organic façade. Alternating balconies soften the structure’s appearance while allowing greenery to weave through, enhancing the relationship between indoor and outdoor spaces. The undulating geometry evokes a sense of agility, reinforcing a natural connection to its surroundings."
    ],
    credits: [
      ["Project", "Viridia Hotel Building"],
      ["Location", "Kavaja, Albania"],
      ["Date", "2025"],
      ["Status", "Commission"],
      ["Size", "114,000 m² / 140 m"],
      ["Architect", "GG-loop + FOCUS Architecture"],
      ["Design architect", "GG-loop"],
      ["Project team", "Aykut Dağ + GG-loop"]
    ],
    duties: ["Concept design development", "Façade development", "Rendering and visualization", "Contributed to diagram production"],
    images: ["img/viridia-1.jpg", "img/viridia-2.jpg", "img/viridia-3.jpg"],
    credit: "Renders by Aykut Dağ",
    x: 0.84, y: 0.80
  },
  {
    group: "practice", glyph: "birdscape", slug: "coa-hills-birdscape",
    title: "COA Hills Birdscape",
    short: "COA Birdscape",
    meta: "Sakarya · 2024 · Research project",
    text: [
      "The Birdscape project, part of the COA HILLS landscape design, is an experimental initiative aimed at encompassing all living beings. It offers a unique experience through birdhouses and the created landscape units. This project’s experimental nature and its connection to informatics involve a process inspired by nature and sustained by natural resources.",
      "For the design of the birdhouses, all birds living in the area were categorized, with those permanently residing there listed according to their size, and their living conditions were carefully studied. The curvilinear forms that make up the design were created by mathematically analyzing bird sounds, with the sound waves being reflected in the masses.",
      "Additionally, the landscape elements placed on the ground were designed to harmonize with these forms, using various mathematical methods to digitally simulate the shapes. These digitally simulated forms were then experimentally produced using concrete mold techniques."
    ],
    credits: [
      ["Project", "COA Hills Birdscape"],
      ["Location", "Sakarya, Turkey"],
      ["Date", "2024"],
      ["Client", "Altınışık Partners"],
      ["Status", "Research Project"],
      ["Architect", "Melike Altınışık Architects"],
      ["Design architect", "Melike Altınışık Architects"],
      ["Project team leader", "Aykut Dağ"],
      ["Project team", "Aykut Dağ"],
      ["Architectural assistant team", "Tuğçe Naz Demir"]
    ],
    duties: ["Team leading", "Concept design development", "Architectural layouts, space organizations", "2D drawings (plan, section, elevation)", "Contributed to diagram production", "Visualization"],
    links: [{ label: "COA Hills at Melike Altınışık Architects", href: "https://www.melikealtinisik.com/2-index/3462-coa-hills/", icon: "external" }],
    images: ["img/birdscape-1.jpg", "img/birdscape-2.jpg", "img/birdscape-3.jpg", "img/birdscape-4.jpg"],
    x: 0.16, y: 0.74
  },
  {
    group: "practice", glyph: "kadikoy", slug: "in-situ-kadikoy",
    title: "IN SITU | Kadıköy Square Urban Design Competition",
    short: "IN SITU Kadıköy",
    meta: "Istanbul · 2020 · 1st Prize",
    text: [
      "Due to the influence of changing urban dynamics, terms such as “transit places” and “non-places” are discussed in contemporary public space literature. According to Augé (1997), a “place” is described as an area with identity, relational, and historical meaning, whereas a “non-place” does not create a specific environment for identity and relationships, instead generating loneliness and similarity.",
      "The concept of place, which instills a sense of belonging to a space, is formed through mental processes that are “in place” on the ground of a specific object, event, structure, or space. This study presents a perspective aimed at reviving human scale and natural environment, human accessibility, and strategies focused on living public functions by referencing the traces and texture embedded in the urban memory throughout historical processes."
    ],
    credits: [
      ["Project", "Kadıköy Square Urban Design Competition"],
      ["Location", "İstanbul, Turkey"],
      ["Date", "2020 (in construction, 2026)"],
      ["Client", "Greater Municipality of Istanbul"],
      ["Status", "Competition, 1st Prize"],
      ["Size", "325,685 m²"],
      ["Architect", "Aboutblank Architecture + Adapt Architects"],
      ["Project team (competition stage)", "Özgür Demirsöz, Tolga Derviş, Danya Sudi, Halil İbrahim Çelik, Aykut Dağ, Öykü Öngören, Serhat Rahat, Sümeyye Uçar, İlda Ersezer"]
    ],
    duties: ["Concept design development", "3D modelling", "Contributed to diagram production", "Visualization"],
    images: ["img/kadikoy-1.jpg", "img/kadikoy-2.jpg", "img/kadikoy-3.jpg"],
    x: 0.46, y: 0.82
  },

  // ---------- Research (İTÜ Architectural Design Computing; Bauhaus-Universität Weimar) ----------
  {
    group: "research", glyph: "stylegan", slug: "physarum-urban-generation-istanbul",
    title: "Physarum Urban Generation I: Istanbul",
    short: "Physarum Urban I",
    meta: "İTÜ · 2024 · Machine learning (part I)",
    text: [
      "Physarum polycephalum connects food sources through remarkably efficient networks; in a maze it finds the shortest path between two food sources (Nakagaki et al., 2000). This paper asks whether that natural optimization can inform urban form, using Istanbul as the case.",
      "A StyleGAN3 model was trained in Google Colab on two datasets: urban plans of Istanbul’s suburban and historical fabric at different scales, and images of Physarum growth patterns. The generated images blend the two into hybrid urban patterns, morphological variations from dense cores to sprawling networks, and new configurations.",
      "The results were mixed: some outputs captured both the city and the organism, while others overfitted, lost spatial coherence or varied in quality. More diverse training data, better model settings and stronger evaluation metrics are named as the next steps. The study continued as part II at Bauhaus-Universität Weimar."
    ],
    credits: [
      ["Project", "Machine Learning for Biomimicry in Architecture: Synthesizing Urban and Fungal Patterns Using StyleGAN, the Case of Istanbul"],
      ["Course", "MBL 559E, Spring 2023–24"],
      ["Programme", "M.Sc. Architectural Design Computing, Istanbul Technical University"],
      ["Date", "June 2024"],
      ["Type", "Course research paper"],
      ["Author", "Aykut Dağ"],
      ["Tools", "StyleGAN3, Python, Google Colab"]
    ],
    images: ["img/stylegan-1.jpg", "img/stylegan-2.jpg", "img/stylegan-3.jpg", "img/stylegan-4.jpg", "img/stylegan-5.jpg", "img/stylegan-6.jpg", "img/stylegan-7.jpg"],
    x: 0.28, y: 0.44
  },
  {
    group: "research", glyph: "weimar", slug: "physarum-urban-generation-weimar", featured: true,
    title: "Physarum Urban Generation II: Weimar",
    short: "Physarum Urban II",
    meta: "Bauhaus-Universität Weimar · 2025 · Urban simulation (part II)",
    text: [
      "Physarum polycephalum is a single-celled organism that forms efficient networks, inspiring simulations for urban design and infrastructure planning. This project uses a Physarum-inspired, agent-based model to simulate an adaptive and porous urban fabric in Weimar.",
      "Instead of a rigid top-down plan, the network emerges organically from attractor points, generating efficient and flexible connections. The goal is an urban system that self-organizes, negotiates complexity, and integrates green, open, and resilient spaces.",
      "The project imagines the city plan as a kind of machine dream, where urban structure emerges through the adaptive logic of Physarum. The visual transitions come from part I, where StyleGAN merged the patterns of slime mold with the geometries of urban grids; here the process was simulated and refined within a parametric design environment, translating this vision onto the fabric of Weimar."
    ],
    credits: [
      ["Project", "Urban Porosity in Weimar: Physarum-Inspired Agent-Based Urban Fabric Generation"],
      ["Course", "Parametric Urban Design & Analysis"],
      ["Institution", "Bauhaus-Universität Weimar (Erasmus+ exchange)"],
      ["Date", "Summer semester 2025"],
      ["Location", "Weimar, Germany"],
      ["Type", "Course project, agent-based simulation and video"],
      ["Author", "Aykut Dağ"],
      ["Tools", "Rhino, Grasshopper, TouchDesigner, StyleGAN, After Effects"]
    ],
    film: { src: "media/urban-porosity.mp4", poster: "img/weimar-poster.jpg", portrait: true },
    links: [{ label: "Instagram post", href: "https://www.instagram.com/p/DQRRft4CGt-/", icon: "instagram" }],
    images: ["img/weimar-1.jpg", "img/weimar-2.jpg"],
    x: 0.58, y: 0.30
  },
  {
    group: "research", glyph: "acoustic", slug: "adaptive-acoustic-panels",
    title: "Adaptive Acoustic Panels in Open Office Layouts",
    short: "Adaptive Acoustics",
    meta: "İTÜ · 2024 · Generative systems",
    text: [
      "Open-plan offices support collaboration but suffer from noise, echo and low speech privacy. This study proposes acoustic panels that respond to sound in real time: they close around loud areas to contain the noise and open again in quiet periods, so the office stays communicative.",
      "Live sound from a microphone is streamed into Grasshopper with Firefly; panels near the source rotate more, distant ones less. Rectangular, hexagonal and radial grids of 1 m modules were simulated, with IsoVist measuring the areas reached by direct sound and Pachyderm tracing the reflections.",
      "In a fully open layout, direct sound reached 29.5% of the floor with the rectangular grid, 35% with the hexagonal and 40% with the radial grid. Reflections spread widest with the rectangular grid and faded fastest with the hexagonal and radial grids."
    ],
    credits: [
      ["Project", "Adaptive Acoustic Panels in Open Office Layouts: Impact of Different Grid Configurations on Noise Control"],
      ["Course", "MBL 512 Üretken Sistemler (Generative Systems)"],
      ["Programme", "M.Sc. Architectural Design Computing, Istanbul Technical University"],
      ["Date", "June 2024"],
      ["Type", "Course research paper"],
      ["Author", "Aykut Dağ"],
      ["Tools", "Rhino, Grasshopper, Firefly, IsoVist, Pachyderm"]
    ],
    images: ["img/acoustic-1.jpg", "img/acoustic-2.jpg", "img/acoustic-3.jpg", "img/acoustic-4.jpg", "img/acoustic-5.jpg", "img/acoustic-6.jpg", "img/acoustic-7.jpg", "img/acoustic-8.jpg", "img/acoustic-9.jpg"],
    x: 0.80, y: 0.52
  },
  {
    group: "research", glyph: "orchestra", slug: "orchestra-of-illumination",
    title: "The Orchestra of Illumination",
    short: "Orchestra",
    meta: "İTÜ · 2024 · Smart materials",
    text: [
      "An interactive installation in which visitors’ steps make light. Its floor is a pressure-sensing system of piezo discs: each press generates a small current that lights LEDs, so the space turns human behaviour into light without batteries or an Arduino.",
      "The form was found in Grasshopper with an attractor-point system: lights close to a pressure node shine brighter, distant ones dimmer. The circuit was simulated in Fritzing and tested on a breadboard prototype with different numbers of LEDs and piezo discs.",
      "The best setup lit nine LEDs in a series circuit with parallel sections and a diode after every two LEDs; the LEDs’ own resistance made extra resistors and capacitors unnecessary. The study points to programmable building surfaces that harvest energy from people or wind."
    ],
    credits: [
      ["Project", "Creating Interaction Spaces from the Human Behavior Data of Pressure on Piezo Buzzer: The Case of “The Orchestra of Illumination”"],
      ["Course", "MBL 557E Material-Based Computational Design in Architecture"],
      ["Instructor", "Assoc. Prof. Dr. Sevil Yazıcı"],
      ["Programme", "M.Sc. Architectural Design Computing, Istanbul Technical University"],
      ["Date", "Fall 2023–24 (January 2024)"],
      ["Type", "Course project, interactive installation prototype"],
      ["Author", "Aykut Dağ"],
      ["Tools", "Rhino, Grasshopper, Fritzing, piezo discs, LEDs"]
    ],
    film: { src: "media/orchestra.mp4", poster: "img/orchestra-poster.jpg" },
    images: ["img/orchestra-1.jpg", "img/orchestra-2.jpg", "img/orchestra-3.jpg", "img/orchestra-4.jpg", "img/orchestra-5.jpg", "img/orchestra-6.jpg", "img/orchestra-7.jpg", "img/orchestra-8.jpg", "img/orchestra-9.jpg", "img/orchestra-10.jpg"],
    x: 0.22, y: 0.78
  },
  {
    group: "research", glyph: "concrete", slug: "concrete-flowers",
    title: "Concrete Flowers",
    short: "Concrete Flowers",
    meta: "İTÜ · 2023 · Fabric formwork",
    text: [
      "A deployable mold for micro-scale fabric formwork, developed from an origami crease pattern of four valley and four mountain lines with added supports, so that the unit stands on its own and still folds into many variations.",
      "The folding was studied in Grasshopper with Crane, then built through laser-cut and 3D-printed trials to a final PLA mold whose eight legs adjust in height step by step, joined at a central detail that lets each move independently. Viscose fabric laid over the strung frame takes the concrete: three parts white cement to one part water, cured for 12 hours.",
      "Four casts with different leg heights produced eight-petalled “concrete flowers”. They were digitized with photogrammetry and compared with Kangaroo fabric simulations: the overall forms match while the bulges differ. As modules, the units suggest facade panels, screens and kinetic surfaces."
    ],
    credits: [
      ["Project", "Extending Possibilities of Deployable Fabric Formwork in the Case of “Concrete Flowers”"],
      ["Course", "MBL 513E Digital Architectural Design and Modeling"],
      ["Programme", "M.Sc. Architectural Design Computing, Istanbul Technical University"],
      ["Date", "Fall 2023"],
      ["Type", "Course project, physical and digital"],
      ["Author", "Aykut Dağ"],
      ["Tools", "Rhino, Grasshopper, Crane, Kangaroo, Weaverbird, Agisoft Metashape, 3D printing (PLA)"]
    ],
    images: ["img/concrete-1.jpg", "img/concrete-2.jpg", "img/concrete-3.jpg", "img/concrete-4.jpg", "img/concrete-5.jpg", "img/concrete-6.jpg", "img/concrete-7.jpg", "img/concrete-8.jpg", "img/concrete-9.jpg", "img/concrete-10.jpg", "img/concrete-11.jpg", "img/concrete-12.jpg"],
    x: 0.52, y: 0.70
  },

  // ---------- Installations and media ----------
  {
    group: "media", glyph: "khora", slug: "khora", featured: true,
    title: "[KHORA]: Space of Becoming with Mind & Body",
    short: "KHORA",
    meta: "IDAF Istanbul · 2026 · Spatial installation",
    text: [
      "In this work, real-time biophysiological data (EEG, heart rate) are processed and transformed into dynamic visual and auditory formations through a generative system design. By employing projection mapping techniques on semi-transparent surfaces, an immersive spatial environment is constructed that responds to the participant’s cognitive and physiological states.",
      "Enriched through synchronous sound design and multi-sensory layers, KHORA shifts the user from a passive observer to an active producer of space. The environment continuously reconfigures itself according to the fluctuating rhythms of the body and mind, forming a closed bio-spatial feedback loop. Through this interaction, space is no longer conceived as a fixed container, but rather as an evolving, responsive organism—an emergent field shaped by human presence and neural activity."
    ],
    credits: [
      ["Project", "[KHORA]: Space of Becoming with Mind & Body"],
      ["Event", "Istanbul Digital Art Festival 2026 (IDAF)"],
      ["Venue", "Atatürk Kültür Merkezi (AKM)"],
      ["Type", "Spatial installation"],
      ["Date", "June 2026"],
      ["Location", "Istanbul, Türkiye"],
      ["Team", "Betül Uçkan, Ayçin Atukeren, Aykut Dağ, Bengü Özmutlu, Tolga Aydoğdu, Umut Pektetik"],
      ["Role", "Computational generative spatial designer"]
    ],
    video: "kiaP_IZAsHA",
    links: [{ label: "@im.khora", href: "https://www.instagram.com/im.khora/", icon: "instagram" }],
    images: ["img/khora-1.jpg", "img/khora-2.jpg", "img/khora-3.jpg"],
    x: 0.28, y: 0.50
  },
  {
    group: "media", glyph: "basilica", slug: "basilica-saint-neophytos",
    title: "Basilica of Saint Neophytos",
    short: "Saint Neophytos",
    meta: "İznik · Research & digital installation",
    text: [
      "This project focuses on the submerged basilica on the shores of Lake İznik, one of the significant monuments of early Christianity. By integrating archaeological preservation with computational design, the work reinterprets the structure’s historical phases through data-driven modeling and algorithmic visualization.",
      "The project analyzes the basilica’s architectural geometry and temporal transformation, translating structural and environmental data into a layered digital narrative. Conceived as an immersive exhibition proposal, it bridges scientific research and artistic representation, offering a contemporary approach to the preservation and communication of İznik’s cultural heritage."
    ],
    credits: [
      ["Project", "Basilica of Saint Neophytos"],
      ["Type", "Independent research & digital installation"],
      ["Location", "İznik, Turkey"],
      ["Team", "Aykut Dağ"]
    ],
    video: "Cqy3eO7X4Eo",
    x: 0.78, y: 0.42
  },
  {
    group: "media", glyph: "cobond", slug: "cobond",
    title: "[Co]BOND",
    short: "[Co]BOND",
    meta: "Norway · 2025 · Installation proposal",
    text: [
      "[Co]BOND is a proposal for an interactive architectural installation exploring ecological empathy and human–nature synchronization. Inspired by Tønsberg’s whaling history, the project reimagines a destructive past as a regenerative future of coexistence.",
      "Through an agent-based choreographic system, participants become spatial agents whose movements activate eco-digital baleen whale agents within a computational feedback loop. Using the Whale Optimization Algorithm (WOA) and camera sensors, the system synchronizes human and digital whale movements, projecting dynamic paths onto transparent tulle surfaces to create an immersive threshold space between technology and ecology."
    ],
    credits: [
      ["Project", "[Co]BOND"],
      ["Type", "Interactive architectural installation proposal"],
      ["Date", "2025"],
      ["Location", "Norway"],
      ["Team", "Bengü Özmutlu, Aykut Dağ, Ayşegül Akçay Kavakoğlu"]
    ],
    images: ["img/cobond-1.jpg", "img/cobond-2.jpg", "img/cobond-3.jpg"],
    x: 0.50, y: 0.78
  }
];

window.ABOUT = {
  photo: "img/aykut.jpg",
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
