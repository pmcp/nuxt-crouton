import { eq } from 'drizzle-orm'
import { pagesPages } from '../../layers/pages/collections/pages/server/database/schema'
import { bookingsLocations } from '../../layers/bookings/collections/locations/server/database/schema'

// ---------------------------------------------------------------------------
// TipTap block helpers
// ---------------------------------------------------------------------------

function doc(...blocks: any[]) {
  return JSON.stringify({ type: 'doc', content: blocks })
}

function heroBlock(title: string, image: string) {
  return { type: 'heroBlock', attrs: { title, image } }
}

function richTextBlock(content: string) {
  return { type: 'richTextBlock', attrs: { content } }
}

function cardGridBlock(cards: { title: string; to?: string; image?: string }[]) {
  return { type: 'cardGridBlock', attrs: { cards } }
}

function ctaBlock(links: { label: string; to?: string; download?: string }[]) {
  return { type: 'ctaBlock', attrs: { links } }
}

// ---------------------------------------------------------------------------
// Navigation order (from navigation.json)
// ---------------------------------------------------------------------------

const NAV_ORDER: Record<string, number> = {
  homepage: 0,
  'a-propos': 1,
  'nos-parcours-et-services': 2,
  'nos-services-à-la-carte': 3,
  bookings: 4,
  contact: 5,
  register: 6,
}

const NAV_PAGES = new Set([
  'homepage',
  'a-propos',
  'nos-parcours-et-services',
  'nos-services-à-la-carte',
  'bookings',
  'contact',
])

// ---------------------------------------------------------------------------
// Pages data
// ---------------------------------------------------------------------------

const PAGES_DATA = [
  // ── homepage ──────────────────────────────────────────────────────────
  {
    slug: 'homepage',
    title: 'Home',
    layout: null,
    image: '/img/dsc_1563-adapté.jpg',
    content: doc(
      heroBlock('Home', '/img/dsc_1563-adapté.jpg'),
      richTextBlock(
        '![](/img/logotype_jaune-1-.png)\n\n'
        + '### Bienvenue sur le site de Velo Solidaire !\n\n'
        + 'Découvrez ici comment nous pouvons vous aider, vous et votre association, à mettre votre public en selle, à disposer de vélos pour organiser des activités avec votre public ou simplement pour vous accompagner dans la mise en place de votre projet vélo.\n\n'
        + 'Vélo Solidaire s\'adresse uniquement aux associations bruxelloises.',
      ),
      cardGridBlock([
        { title: 'Les ateliers de la rue Voot', to: 'https://voot.be/ateliers/ateliers-velo/', image: '/img/voot_transparent.png' },
        { title: 'CyCLO', to: 'https://www.cyclo.org/fr', image: '/img/logo_png_black_backgroundtransparant.png' },
        { title: 'Pro Velo', to: 'https://www.provelo.org/', image: '/img/provelo_rvb-002-.png' },
        { title: 'Bruxelles Mobilité', to: 'https://mobilite-mobiliteit.brussels/fr', image: '/img/bm-fr-nl-logo-rgb.png' },
      ]),
    ),
    translations: {
      nl: {
        title: 'Home',
        content: doc(
          heroBlock('Home', '/img/dsc_1563-adapté.jpg'),
          richTextBlock(
            '![](/img/logotype_jaune-1-.png)\n\n'
            + '### Welkom op de website van Solidaire Velo !\n\n'
            + 'Ontdek hier hoe we jou en je vereniging kunnen helpen om je groep te leren fietsen, om fietsen te bekomen of bij het vormgeven van jullie eigen fietsproject.\n\n'
            + 'Solidaire Velo richt zich uitsluitend op Brusselse verenigingen.',
          ),
          cardGridBlock([
            { title: 'Les ateliers de la rue Voot', to: 'https://voot.be/ateliers/ateliers-velo/', image: '/img/voot_transparent.png' },
            { title: 'CyCLO', to: 'https://www.cyclo.org/nl', image: '/img/logo_png_black_backgroundtransparant.png' },
            { title: 'Pro Velo', to: 'https://www.provelo.org/nl/', image: '/img/provelo_rvb-002-.png' },
            { title: 'Bruxelles Mobilité', to: 'https://mobilite-mobiliteit.brussels/nl', image: '/img/bm-fr-nl-logo-rgb.png' },
          ]),
        ),
      },
    },
    config: {},
  },

  // ── a-propos ──────────────────────────────────────────────────────────
  {
    slug: 'a-propos',
    title: 'A propos',
    layout: null,
    image: '/img/dsc_1720.jpg',
    content: doc(
      heroBlock('A propos', '/img/dsc_1720.jpg'),
      richTextBlock(
        '# **A propos de Vélo Solidaire...**\n\n'
        + '**Vélo Solidaire a démarré fin 2020 avec l\'objectif de faciliter l\'accès à la pratique du vélo à Bruxelles. Pour ce faire, le projet s\'adresse aux associations bruxelloises dont le public est éloigné de la pratique du vélo pour des raisons culturelles, sociales, économiques ou de genre.**\n\n'
        + 'Ainsi, Vélo Solidaire offre ***des parcours pour le public de votre association*** comprenant de la mise en selle, des cours de vélo dans la circulation, la mise à disposition d\'un vélo reconditionné pendant un an (avec la possibilité de le racheter à la fin) ainsi qu\'une introduction à l\'entretien et à la mécanique du vélo.\n\n'
        + 'Par ailleurs, Vélo Solidaire propose des formations ***pour le personnel des associations*** afin de les rendre les plus autonomes possible dans la mise en place de leur projet vélo : mise en selle, encadrement d\'un groupe dans la circulation, mécanique de base, organiser une sortie, tracer un itinéraire...\n\n'
        + '**Vélo Solidaire en quelques chiffres**\\\n'
        + 'Depuis le début du projet, ce sont plus de 1400 personnes qui ont appris à rouler à vélo, ont reçu un vélo reconditionné et ont appris à l\'entretenir correctement. En moyenne, 3/4 des personnes qui ont reçu un vélo souhaitent le racheter après l\'avoir utilisé pendant un an. Les autres nous rendent le vélo pour qu\'il puisse être remis à un.e autre participant.e. Heureusement, très peu de vélos ont été déclarés volés (2%).\n\n'
        + '**Rapport d\'activité**',
      ),
      ctaBlock([
        { label: 'Rapport d\'activité Vélo Solidaire 2023', download: '/img/rapport-d-activité-vélo-solidaire-2023.pdf' },
      ]),
      richTextBlock(
        '**Etude d\'impact**\\\n'
        + 'En octobre 2022, Vélo Solidaire a fait faire une évaluation de l\'impact social du projet par le SAW-B.',
      ),
      ctaBlock([
        { label: 'Etude d\'impact', download: '/img/vélo_solidaire_étude_web_8_12_compressed-1-.pdf' },
      ]),
      richTextBlock(
        '**Partenariat**\\\n'
        + 'Vélo Solidaire est le fruit d\'un partenariat entre les Ateliers de la rue Voot, CyCLO et Pro Velo. Il est financé par Bruxelles Mobilité.',
      ),
      cardGridBlock([
        { title: 'Les Ateliers de la rue Voot', to: 'https://voot.be/ateliers/ateliers-velo/', image: '/img/voot_transparent.png' },
        { title: 'CyCLO', to: 'https://www.cyclo.org/fr', image: '/img/logo_png_black_backgroundtransparant.png' },
        { title: 'Pro Velo', to: 'https://www.provelo.org/', image: '/img/provelo_rvb-002-.png' },
        { title: 'Bruxelles Mobilité', to: 'https://mobilite-mobiliteit.brussels/fr', image: '/img/bm-fr-nl-logo-rgb.png' },
      ]),
    ),
    translations: {
      nl: {
        title: 'Over',
        content: doc(
          heroBlock('Over', '/img/dsc_1720.jpg'),
          richTextBlock(
            '# Over Solidaire Velo\n\n'
            + '**Solidaire Velo werd eind 2020 opgericht om de toegang tot de fiets in Brussel te vergemakkelijken. Het project richt zich tot Brusselse verenigingen waarvan de gebruikers of leden geen of moeilijk toegang hebben tot de fiets omwille van culturele, sociale, economische of gendergerelateerde redenen.**\n\n'
            + 'Solidaire Velo biedt opleidingen aan om de ***deelnemers van de verening*** te leren fietsen (tout-court en/of in het verkeer) en om hun fiets te leren onderhouden. Het project stelt ook opgeknapte fietsen ter beschikking die de deelnemers een jaar lang kunnen gebruiken en na afloop kunnen kopen.\n\n'
            + 'Daarnaast biedt Solidaire Velo ook opleidingen aan voor de ***medewerkers van de vereniging*** zodat zij zelf hun eigen fietsproject kunnen vormgeven: het leren fietsen, het begeleiden van een groep in het verkeer, basismechanica, het organiseren van een fietsuitstap, het uitstippelen van een route etc.\n\n'
            + '**Solidaire Velo in cijfers**\\\n'
            + 'Sinds het begin van het project hebben meer dan 1.400 mensen leren fietsen, een opgeknapte fiets gekregen en geleerd hoe ze die goed kunnen onderhouden.\\\n'
            + 'Ongeveer 75% van de mensen die een fiets hebben gekregen en hem een jaar hebben gebruikt, gaat nadien over tot een aankoop. De anderen leveren de fiets in, zodat hij kan dienen voor een andere deelnemer.\\\n'
            + 'Er worden gelukkig maar heel weinig fietsen als gestolen opgegeven (2%).\n\n'
            + '**Activiteitenverslag**',
          ),
          ctaBlock([
            { label: 'Activiteitenverslag Solidaire Velo 2023', download: '/img/rapport-d-activité-vélo-solidaire-2023.pdf' },
          ]),
          richTextBlock(
            '**Impactstudie**\\\n'
            + 'In oktober 2022 gaf Solidaire Velo de opdracht aan SAW-B om de sociale impact van het project te beoordelen.',
          ),
          ctaBlock([
            { label: 'Impactstudie', download: '/img/vélo_solidaire_étude_web_8_12_compressed-1-.pdf' },
          ]),
          richTextBlock(
            '**Partnerschap**\\\n'
            + 'Solidaire Velo is het resultaat van een samenwerking tussen Les Ateliers de la rue Voot, CyCLO en Pro Velo. Het wordt gefinancierd door Brussel Mobiliteit.',
          ),
          cardGridBlock([
            { title: 'Les ateliers de la rue Voot', to: 'https://voot.be/ateliers/ateliers-velo/', image: '/img/voot_transparent.png' },
            { title: 'CyCLO', to: 'https://www.cyclo.org/nl', image: '/img/logo_png_black_backgroundtransparant.png' },
            { title: 'Pro Velo', to: 'https://www.provelo.org/nl', image: '/img/provelo_rvb-002-.png' },
            { title: 'Bruxelles Mobilité', to: 'https://mobilite-mobiliteit.brussels/nl', image: '/img/bm-fr-nl-logo-rgb.png' },
          ]),
        ),
      },
    },
    config: {},
  },

  // ── nos-parcours-et-services ──────────────────────────────────────────
  {
    slug: 'nos-parcours-et-services',
    title: 'Parcours',
    layout: null,
    image: '',
    content: doc(
      richTextBlock(
        '# Deux types de parcours\n\n'
        + 'En fonction des besoins de votre public, deux types d\'accompagnement vous sont proposés. Si vous souhaitez faire une demande de participation au projet, merci de choisir le parcours qui vous intéresse et de remplir le formulaire correspondant.\n\n'
        + '![](/img/tableau-parcours-fr.jpg)\n\n'
        + '### *Parcours d\'apprentissage*\n\n'
        + 'Ce parcours s\'adresse à un public qui n\'a jamais appris à pédaler.\n\n'
        + '##### **Objectifs :**\n\n'
        + '* Apprendre à pédaler\n'
        + '* Apprendre à rouler dans le trafic\n'
        + '* S\'approprier le vélo\n\n'
        + '**Etapes du parcours :**\n\n'
        + '* 6 séances de formation pour apprendre à pédaler\n'
        + '* 6 séances de formation pour apprendre à rouler dans le trafic\n'
        + '* la mise à disposition d\'un vélo reconditionné gratuite pendant 1 an à chaque participant.e\n'
        + '* 1 séance de formation à l\'entretien du vélo et à la mécanique de base\n\n'
        + '**Tarif :**\\\n'
        + '800€ pour tout le groupe (entre 5 et 12 personnes maximum)\\\n'
        + 'Si le coût de votre participation devait représenter un frein, n\'hésitez pas à nous contacter, nous chercherons une solution ensemble.\n\n'
        + '##### **>>> Demande d\'inscription [ici](https://docs.google.com/forms/d/e/1FAIpQLSfUZG9idqEHy4TLxdLb6C-Hb9IJngMaG9PR7wDTUd3BPD9WqA/viewform) <<<**\n\n'
        + '### *Parcours d\'autonomie*\n\n'
        + 'Ce parcours s\'adresse à un public qui sait déjà rouler, mais qui se trouve en grande précarité de mobilité et qui a surtout besoin d\'avoir un vélo à disposition. Le parcours se compose comme suit :\n\n'
        + '**Objectif :**\\\nS\'approprier le vélo\n\n'
        + '**Etapes du parcours :**\n\n'
        + '* la mise à disposition d\'un vélo reconditionné gratuite pendant 1 an à chaque participant.e\n'
        + '* 2 séances de formation sur mesure en fonction des besoins\n'
        + '* 1 séance de formation à l\'entretien du vélo et à la mécanique de base\n\n'
        + '**Tarif :**\\\n'
        + '100€ pour tout le groupe (entre 5 et 12 personnes maximum)\\\n'
        + 'Si le coût de votre participation devait représenter un frein, n\'hésitez pas à nous contacter, nous chercherons une solution ensemble.\n\n'
        + '##### **>>> Demande d\'inscription [ici](https://docs.google.com/forms/d/e/1FAIpQLSfDXdj8sUn8bQgjkmfj-jGmC2k74P9LHzPGz2UhqqQ5sDeXiA/viewform) <<<**',
      ),
    ),
    translations: {
      nl: {
        title: 'Trajecten',
        content: doc(
          richTextBlock(
            '# Trajecten\n\n'
            + 'Afhankelijk van de behoeften van uw publiek, worden u twee soorten ondersteuning aangeboden. Als u zich wilt aanmelden voor deelname aan het project, kies dan het traject die u interesseert en vul het bijbehorende formulier in.\n\n'
            + '![](/img/tableau-parcours-nl.png)\n\n'
            + '### *Leertraject*\n\n'
            + 'Dit traject is bedoeld voor mensen die nog nooit hebben leren trappen.\n\n'
            + '**Doelstellingen:**\n\n'
            + '* Leren fietsen\n'
            + '* Leren fietsen in het verkeer\n'
            + '* Aan de fiets wennen\n\n'
            + '**Etappes van het traject:**\n\n'
            + '* 6 sessies om te leren fietsen\n'
            + '* 6 sessies om veilig in het verkeer te leren fietsen\n'
            + '* de overhandiging van een fiets aan elke deelnemer + opleiding fietsen in het verkeer\n'
            + '* 1 les in fietsonderhoud + basismechanica\n\n'
            + '**Prijs:**\\\n'
            + '€ 800 voor de hele groep (tussen 5 en maximaal 12 personen)\n'
            + 'Vormen de kosten van je deelname een obstakel? Neem contact met ons op en samen zoeken we naar een oplossing!\n\n'
            + '#### **>>> Inscrijving verzoek [hier](https://docs.google.com/forms/d/e/1FAIpQLSdjs11lZgiI2kXcJsNo-jnkaf69M23ukL3z0D4Wn3lakGhEaA/viewform) <<<**\n\n'
            + '### *Traject naar zelfstandigheid*\n\n'
            + 'Dit traject is bedoeld voor mensen die al kunnen fietsen, maar die zich in een precaire mobiliteitssituatie bevinden en die vooral een fiets voor verplaatsingen nodig hebben.\n\nHet traject is als volgt samengesteld:\n\n'
            + '**Doelstelling:**\\\nWennen aan de fiets\n\n'
            + '**Etappes van het traject:**\n\n'
            + '* de overhandiging van een fiets aan elke deelnemer + opleiding fietsen in het verkeer\n'
            + '* 2 sessies op maat op basis van behoeften\n'
            + '* 1 opleiding fietsonderhoud + basismechanica\n\n'
            + '**Prijs:**\\\n'
            + '€ 100 voor de hele groep (tussen 5 en maximaal 12 personen)\\\n'
            + 'Vormen de kosten van je deelname een obstakel? Neem contact met ons op en samen zoeken we naar een oplossing.\n\n'
            + '#### **>>> Inscrijving verzoek [hier](https://docs.google.com/forms/d/e/1FAIpQLSdrn0IXxMrafrRrKzJ8utwI6cMOI-TYf1OS7nWarHRDrTchow/viewform) <<<**',
          ),
        ),
      },
    },
    config: {},
  },

  // ── nos-services-à-la-carte ───────────────────────────────────────────
  {
    slug: 'nos-services-à-la-carte',
    title: 'Services à la carte',
    layout: null,
    image: '',
    content: doc(
      richTextBlock(
        '# Services à la carte\n\n'
        + 'Vous ne vous retrouvez pas dans les parcours proposés ? Ou bien vous souhaitez aller plus loin ? Composez vous-même votre parcours et servez-vous dans notre boite à outils.\n\n'
        + '### Avoir accès à des vélos\n\n'
        + '* **[Réservez une de nos flottes Vélo Solidaire](https://www.velosolidaire.brussels/bookings.fr)** pour organiser vos propres cours de mise en selle ou organiser des sorties à vélos avec votre public\n'
        + '* ***Installez une flotte*** de vélos au sein de votre association et la rendez-la accessible aux associations du quartier.\n\n'
        + '### Réparer des vélos\n\n'
        + '* Organisez ***un atelier mobile*** : votre association a reçu des Vélos Solidaires mais leur entretien n\'a pas été assuré ? L\'équipe des Ateliers de la Rue Voot se déplace dans votre association pour accompagner vos participants dans des petites réparations : crevaison, réglages de freins ou de transmission…\n'
        + '* Vos participants aimeraient connaitre un lieu où ils peuvent entretenir et réparer leurs Vélos Solidaires ? L\'équipe des Ateliers de la Rue Voot les amène à la ***découverte de l\'atelier participatif*** proche de chez vous !\n\n'
        + '![](/img/atelier-voot.jpg)\n\n'
        + '### Apprendre à un groupe à pédaler\n\n'
        + 'Vous voulez organiser des activités à vélo pour votre public mais vos bénéficiaires n\'ont jamais appris à pédaler ? Nous proposons un module de formation pour vous transmettre notre méthodologie pour apprendre l\'équilibre dynamique à vélo, en se mettant dans les conditions réelles d\'apprentissage.\\\n'
        + '**Dates et inscriptions** [ici](https://www.billetweb.fr/formation-mise-en-selle)\n\n'
        + '### Encadrer un groupe dans la circulation\n\n'
        + '* ***Encadrer un groupe de cyclistes dans la circulation***, ça ne s\'improvise pas ! Nous proposons un module de formation qui mélange théorie et pratique pour que vous vous sentiez plus outillé.e.s à encadrer un déplacement en groupe à vélo.\n\n'
        + '![](/img/accompagner-une-sortie.jpg)\n\n'
        + '* Vous vous lancez dans l\'organisation de sorties à vélo avec votre public, et vous souhaiteriez que Pro Velo soit présent pour vous mettre en confiance et ***vous soutenir dans l\'encadrement du groupe*** ? Nous pouvons en discuter et voir de quelle manière nous pouvons vous aider.\n'
        + '* ***Le choix de l\'itinéraire*** est un des facteurs-clés pour rendre la pratique du vélo agréable et sécurisante. Vous voulez organiser une sortie avec vos participant.e.s, ou conseiller quelqu\'un sur l\'itinéraire de son déplacement, mais vous ne savez pas trop comment vous y prendre ? Nous pouvons vous aider !\n\n'
        + '![](/img/dsc_1819.jpg)\n\n'
        + '### Proposer des sorties à ses participant.e.s\n\n'
        + '* La ***Bike Experience*** permet de découvrir le code de la route, de faire une sortie en groupe dans le trafic, de tester un vélo pendant 2 semaines, ou encore d\'être accompagné.e individuellement par un.e coach sur 3 déplacements de votre choix, et tout cela gratuitement ! Cet évènement est un très bon complément au parcours de formation Vélo Solidaire et représente une occasion idéale pour votre public de sortir du cadre de l\'association.\\\nhttps://bikeexperience.brussels/\n'
        + '* Vélo Solidaire peut organiser, à la demande, des ***balades guidées*** qui peuvent inclure toute la famille. Elles peuvent avoir lieu en semaine ou le week-end, sur un thème choisi (par exemple, découvert des espaces verts) et sont encadrées par un.e guide de Pro Velo.\n\n'
        + '### Trouver du parking pour les Vélos Solidaires\n\n'
        + 'Votre public n\'ose pas demander de vélo par ***manque de lieu sécurisé*** où le stocker ? Cherchons une solution ensemble ! Vous avez repéré un garage, un hangar, un endroit qui pourrait faire office de parking vélos dans votre quartier ? Contactez-nous, nous étudierons la possibilité de l\'aménager en parking vélo.',
      ),
    ),
    translations: {
      nl: {
        title: 'Diensten à la carte',
        content: doc(
          richTextBlock(
            '# Diensten à la carte\n\n'
            + 'Vind je niet wat je zoekt? Of wil je nog een stapje verder gaan? Stel zelf je parcours samen en neem een kijkje tussen het volledige activiteitenaanbod.\n\n'
            + '### Op zoek naar fietsen\n\n'
            + '* [Reserveer een van onze Solidaire Velo-fietsvloten](https://www.velosolidaire.brussels/locations/abattoirs.nl) om je eigen met je groep fietsopleidingen of fietsuitstapjes te organiseren.\n'
            + '* ***Herberg zelf een fietsvloot*** voor je organisatie en stel hem ter beschikking van andere lokale verenigingen.\n\n'
            + '### Fietsen herstellen\n\n'
            + '* Organiseer ***een mobiel fietsatelier***: je vereniging heeft enkele Solidaire Velos ontvangen, maar niemand staat in voor het onderhoud? Het team van Les Ateliers de la Rue Voot komt naar jullie organisatie toe en helpt de deelnemers met het uitvoeren van kleine herstellingen: lekke banden, de afstelling van remmen of versnellingen, enz.\n'
            + '* Willen je deelnemers graag weten waar ze hun Solidaire Velos kunnen onderhouden en herstellen? Het team van Ateliers de la Rue Voot neemt hen mee naar ***een participatief fietsatelier*** bij jou in de buurt!\n\n'
            + '![](/img/atelier-voot.jpg)\n\n'
            + '### Een groep leren fietsen\n\n'
            + 'Je wil met je groep fietsactiviteiten organiseren, maar je deelnemers kunnen eigenlijk nog niet fietsen? We reiken een leermethode aan die jou in staat stelt anderen aan te leren om op de fiets het evenwicht te houden.\\\n'
            + '**Data en inscrijving** [hier](https://www.billetweb.fr/formation-mise-en-selle)\n\n'
            + '### Een groep begeleiden in het verkeer\n\n'
            + '* ***Een groep fietsers begeleiden in het verkeer*** laat je best niet aan het toeval over! Wij bieden een opleidingsmodule die theorie en praktijk combineert om je klaar te stomen om een groep fietsers in alle veiligheid door het verkeer te leiden.\n\n'
            + '![](/img/accompagner-une-sortie.jpg)\n\n'
            + '* Wil er met je doelpubliek op uittrekken en wil je graag dat Pro Velo je bijstaat om ***ondersteuning te bieden om de groep te begeleiden***? We bespreken dit graag met je en kijken samen hoe we kunnen helpen.\n'
            + '* ***De keuze van de route*** is een van de belangrijkste voorwaarde voor een leuke en veilige fietsrit. Wil je een fietsuitstapje organiseren met je deelnemers, of iemand wat advies geven over welke route die best kan nemen, maar weet je niet zeker hoe je dit moet aanpakken? Wij kunnen je helpen!\n\n'
            + '![](/img/dsc_1819.jpg)\n\n'
            + '### Fietstochten organiseren\n\n'
            + '* ***Bike Experience*** geeft je de kans om de verkeersregels te leren, deel te nemen aan een groepsuitstap in het verkeer, twee weken lang een fiets uit te proberen of individueel begeleid te worden door een coach op drie ritten naar keuze, en dat allemaal gratis! Dit event is een geweldige aanvulling op de opleiding van Solidaire Velo en is een ideale gelegenheid voor jouw publiek om uit hun comfortzone van de vereniging te komen.\\\nhttps://bikeexperience.brussels/\n'
            + '* Op verzoek kan Solidaire Velo ***gegidste fietstochten*** organiseren voor het hele gezin. Je kan kiezen of ze tijdens de week of in het weekend plaatsvinden, of je een bepaald thema wil verkennen (bijvoorbeeld de groene ruimtes in Brussel ontdekken) of begeleid wil worden door een Pro Velo-gids.\n\n'
            + '### Fietsparking vinden\n\n'
            + 'Hebben je deelnemers ***geen veilige plek*** om hun solidaire velo te stallen? We zoeken samen een oplossing! Heb je in jouw buurt een garage, loods of andere plek gezien die gebruikt kan worden als fietsenstalling? Neem contact met ons op en we kijken of we ze kunnen omvormen tot een fietsenstalling.',
          ),
        ),
      },
    },
    config: {},
  },

  // ── bookings ──────────────────────────────────────────────────────────
  {
    slug: 'bookings',
    title: 'Réservations',
    layout: null,
    image: '/img/dsc_2001.jpg',
    content: doc(
      heroBlock('Réservations', '/img/dsc_2001.jpg'),
      richTextBlock(
        '# Réserver une flotte de vélos\n\n'
        + 'Les flottes Vélos Solidaire sont accessibles à toute association psyco/socio/culturelle ou de promotion de la santé et de la cohésion sociale active en Région bruxelloise et qui s\'adresse à un public moins favorisé. Les vélos sont disponibles à titre gratuit pour des activités d\'apprentissage du vélo ou pour des sorties à vélo en groupe.\n\n'
        + 'Les flottes Vélo Solidaire sont reprises ci-dessous avec une description des vélos et du matériel disponible ainsi que les horaires d\'ouverture (en fonction du partenaire qui accueille la flotte).\n\n'
        + '**Veuillez lire la charte d\'utilisation avant de choisir la flotte et la date qui vous convient.**\n\n'
        + 'Dans le but de garantir une utilisation facile et optimale de ces flottes, il vous est demandé de :\n\n'
        + '1. *Respecter les horaires* de réservation (prévoyez de terminer votre activité un peu plus tôt pour avoir le temps de bien ranger les vélos). Il vous est possible de réserver des vélos pour une journée entière, juste une matinée ou juste une après-midi. Attention de bien vous référer aux horaires d\'ouverture et fermeture des différents lieux.\n'
        + '2. Pour les activités récurrentes, *ne pas réserver les plages horaires trop à l\'avance* (maximum 3 mois) pour laisser l\'opportunité à toutes les associations partenaires de bénéficier du service.\n'
        + '3. Dans la mesure du possible *annuler la réservation bien à temps* (1 semaine minimum) pour libérer la plage horaire à une autre association.\n'
        + '4. Avant leur utilisation *vérifier* que *les pneus* sont bien gonflés, *les selles* à la bonne hauteur et *les freins* en bon état.\n'
        + '5. *Rendre les vélos dans l\'état emprunté* (n\'hésitez pas à regonfler les pneus, vérifier que la selle et le guidon sont bien fixés…).\n'
        + '6. *Ranger les vélos* selon leur taille et refermer la longe avec le cadenas à clé.\n'
        + '7. *Si un vélo a un souci mécanique*, le signaler par Email à velosolidaire@cyclo.org et placer le vélo à l\'endroit prévu pour les vélos nécessitant une réparation.\n'
        + '8. Veiller à ce que le *local* soit *propre*, *rangé* et *bien fermé* à votre départ\n'
        + '9. Chaque association qui utilise la flotte est responsable d\'avoir une *assurance* Responsabilité Civile et accident du travail.\n'
        + '10. *En cas de vol ou de perte*, un dédommagement de 250€ vous sera demandé (+ 15€ pour le cadenas, le cas échéant).\n\n'
        + '*En parler autour de vous* pour en faire profiter un maximum de personnes !',
      ),
    ),
    translations: {
      nl: {
        title: 'Bookings',
        content: doc(
          heroBlock('Bookings', '/img/dsc_2001.jpg'),
          richTextBlock(
            '# Een fietsvloot reserveren\n\n'
            + 'De fietsvloot van Solidaire Velo staat ter beschikking van elke (socio-)culturele vereniging die zich inzet voor de gezondheid en de sociale cohesie van een kansarm publiek en actief is in het Brussels Gewest. De fietsen zijn gratis beschikbaar om te léren fietsen of voor een fietstocht in groep.\n\n'
            + 'Hieronder vindt u de vloten van Solidaire Velo met een beschrijving van de fietsen en het beschikbare materiaal, evenals de openingstijden (afhankelijk van de partner die de vloot host).\n\n'
            + '**Lees gebruikersovereenkomst alvorens je een vloot en datum kiest.**\n\n'
            + 'Om ervoor te zorgen dat deze fietsvloten gemakkelijk en optimaal gebruikt kunnen worden, vragen we het volgende:\n\n'
            + '1. *Respecteer de reserveringstijden* (denk eraan om je activiteit iets eerder af te ronden zodat je tijd hebt om de fietsen netjes te stallen). Je kan fietsen reserveren voor een hele dag, een ochtend of een middag. Let op de openings- en sluitingstijden van de verschillende locaties.\n'
            + '2. *Reserveer niet te lang op voorhand* voor terugkerende activiteiten (max. drie maanden) om alle partnerverenigingen de kans te geven van de dienst gebruik te maken.\n'
            + '3. *Annuleer de reservatie* indien zo veel mogelijk *op voorhand* (minimaal één week) om het tijdslot vrij te maken voor een andere vereniging.\n'
            + '4. *Controleer* voor het gebruik of *de banden* goed opgepompt zijn, of *de zadels* op de juiste hoogte staan en of *de remmen* goed werken.\n'
            + '5. *Breng de fietsen terug in de staat waarin je ze hebt uitgeleend* (check de bandenspanning en pomp wat bij indien nodig, check de positie en de stabiliteit van het zadel en het stuur, enz.)\n'
            + '6. *Stal de fietsen* volgens grootte en sluit de kabel met het hangslot.\n'
            + '7. *Als een fiets een mechanisch probleem heeft*, meld dit dan per mail aan velosolidaire@cyclo.org en zet de fiets op de plek die voorzien is voor fietsen die hersteld moeten worden.\n'
            + '8. Zorg ervoor dat de ruimte *opgeruimd, netjes en afgesloten* is wanneer je weggaat.\n'
            + '9. Elke vereniging die gebruik maakt van de fietsvloot is verondersteld te beschikken over een *verzekering* voor Burgerlijke Aansprakelijkheid en voor Schade op het Werk.\n'
            + '10. In geval van *diefstal of verlies* wordt een schadevergoeding van €250 per fiets aangerekend (+ €15 voor het slot).\n\n'
            + '*Spread the word*, om zo veel mogelijk mensen van deze dienst te laten genieten !',
          ),
        ),
      },
    },
    config: {},
  },

  // ── contact ───────────────────────────────────────────────────────────
  {
    slug: 'contact',
    title: 'Contact et inscription',
    layout: null,
    image: '',
    content: doc(
      richTextBlock(
        '# Nous contacter\n\n'
        + 'Intéressé.e.s par un de nos parcours ? Après avoir rempli le **formulaire de demande de participation** correspondant au parcours souhaité, nous prendrons contact avec vous pour évaluer ensemble la faisabilité de votre projet.\n\n'
        + '**Formulaire de demande de participation pour le parcours d\'apprentissage** : [ici](https://docs.google.com/forms/d/e/1FAIpQLSfUZG9idqEHy4TLxdLb6C-Hb9IJngMaG9PR7wDTUd3BPD9WqA/viewform)\n\n'
        + '**Formulaire de demande de participation pour le parcours d\'autonomie** : [ici](https://docs.google.com/forms/d/e/1FAIpQLSfDXdj8sUn8bQgjkmfj-jGmC2k74P9LHzPGz2UhqqQ5sDeXiA/viewform)\n\n'
        + '**Des questions ?**\n\n'
        + '* Concernant les formations vélo, les formations d\'encadrant.e.s et tous les services liés à l\'organisation de sorties : Noémie Dembour - n.dembour@provelo.org\n'
        + '* Concernant l\'obtention d\'un vélo reconditionné et l\'accès aux flottes de vélos : Cécile Van Overstraeten - cecile@cyclo.org\n'
        + '* Concernant la mécanique (ateliers mobiles, visites d\'atelier...) : l\'équipe des Ateliers de la rue Voot - velosolidaire@voot.be',
      ),
    ),
    translations: {
      nl: {
        title: 'Contact en inschrijving',
        content: doc(
          richTextBlock(
            '# Contact\n\n'
            + 'Interesse in één van onze trajecten? Na het invullen van het deelnameaanvraagformulier, nemen we contact met je op en beoordelen we samen de haalbaarheid van je fietsproject.\n\n'
            + '**Aanvraagformulier deelname voor de leer-parcours:** [hier](https://docs.google.com/forms/d/e/1FAIpQLSdjs11lZgiI2kXcJsNo-jnkaf69M23ukL3z0D4Wn3lakGhEaA/viewform)\n\n'
            + '**Aanvraagformulier deelname voor de parcours naar zelfstandigheid:** [hier](https://docs.google.com/forms/d/e/1FAIpQLSdrn0IXxMrafrRrKzJ8utwI6cMOI-TYf1OS7nWarHRDrTchow/viewform)\n\n'
            + '**Vragen?**\n\n'
            + '* Voor fietsopleidingen, begeleidersopleidingen en alles wat bij een fietstocht komt kijken: Noémie Dembour - n.dembour@provelo.org\n'
            + '* Voor het bekomen van een (gereviseerede) tweedehandsfiets en de toegang tot en fietsvloot: Cécile Van Overstraeten - cecile@cyclo.org\n'
            + '* Voor vragen m.b.t. fietsmechaniek (mobiele fietsateliers, bezoeken aan het fietsatelier, enz.): het team van Ateliers de la rue Voot - velosolidaire@voot.be',
          ),
        ),
      },
    },
    config: {
      formActive: true,
    },
  },

  // ── register ──────────────────────────────────────────────────────────
  {
    slug: 'register',
    title: 'Inscription',
    layout: null,
    image: null,
    content: doc(
      richTextBlock(
        'Remplissez le questionnaire suivant, nous traitons votre demande dés que possible.',
      ),
    ),
    translations: {
      nl: {
        title: 'Schrijf je in',
        content: doc(
          richTextBlock('content'),
        ),
      },
    },
    config: {
      formActive: false,
      form: [
        { type: 'text', label: 'Association', help: 'Association' },
        { type: 'textarea', label: 'Adresse', help: 'Adresse' },
        { type: 'text', label: 'Prénom d\'un.e référent.e', help: 'Prénom d\'un.e référent.e' },
        { type: 'email', label: 'E-mail de contact de la personne référente', help: 'E-mail de contact de la personne référente' },
        { type: 'text', label: 'Tel de la personne référente', help: 'Tel de la personne référente' },
        { type: 'textarea', label: 'Description des activités prévues avec les vélos', help: 'Description des activités prévues avec les vélos' },
        { type: 'textarea', label: 'Si activité récurente, quelle fréquence estimée', help: '(1 fois par semaine, 2 fois par semaine, 1 fois par mois,…)' },
        { type: 'text', label: 'Nombre de participant.e.s estimé', help: 'Nombre de participant.e.s estimé' },
      ],
      formSend: 'Merci pour votre demande d\'inscription à Vélo Solidaire, nous traitons votre demande et vous y donnerons accès le plus rapidement possible.',
    },
  },
]

// ---------------------------------------------------------------------------
// Locations data
// ---------------------------------------------------------------------------

const LOCATIONS_DATA = [
  // ── Marolles ──────────────────────────────────────────────────────────
  {
    title: 'Flotte des Marolles',
    street: 'Rue du miroir 22',
    zip: '1000',
    city: 'Bruxelles',
    location: '{"type":"Point","coordinates":[4.347782555942949,50.84030544819478]}',
    order: 0,
    content:
      'L\'accès à la flotte se fait via l\'atelier CyCLO. Veuillez vous y présenter pour qu\'on vous donne les clés.\n'
      + 'La flotte est disponible **du lundi au vendredi entre 9h et 17h**.\n\n'
      + '### Vélos disponibles\n\n'
      + '**Flotte d\'apprentissage**\\\n'
      + '11 vélos Oxford 26\'\' (taille centre-top 38cm)\n\n'
      + '**Flotte de sortie**\\\n'
      + '7 vélos Oxford Avanti taille S (taille centre-top 43cm)\\\n'
      + '7 vélos Btwin Elops 360 taille M (taille centre-top 48cm)\\\n'
      + '1 vélo Btwin Elops 360 taille L (taille centre-top 51,5cm)\n\n'
      + '### Matériel divers\n\n'
      + 'Cadenas, casques, chasubles, clips pour pantalon, sacoches, plots, pompes, boite à outils',
    translations: {
      nl: {
        title: 'Vloot van de Marollen',
        street: 'Spiegelstraat 22',
        zip: '1000',
        city: 'Brussel',
        content:
          'De toegang tot de vloot wordt beheerd door het CyCLO atelier. Kom langs en we geven je de sleutels.\n\n'
          + 'De vloot is beschikbaar **van maandag tot vrijdag tussen 9u en 17u**.\n\n'
          + '### Beschikbare fietsen\n\n'
          + '**Leer-fietsen**\\\n'
          + '11 fietsen Oxford framemaat 26\'\' (center-top 38cm)\n\n'
          + '**Fietstocht-fietsen**\\\n'
          + '7 fietsen Oxford Avanti framemaat S (center-top 43cm)\\\n'
          + '7 fietsen Btwin Elops 360 framemaat M (center-top 48cm)\\\n'
          + '1 fiets Btwin Elops 360 framemaat L (center-top 51,5cm)\n\n'
          + '### Accessoires\n\n'
          + 'Fietssloten, helmen, fluohesjes, broekclips, fietstassen, kegels, pompen, gereedschapskid',
      },
    },
  },

  // ── Abattoirs ─────────────────────────────────────────────────────────
  {
    title: 'Flotte des abattoirs d\'Anderlecht',
    street: 'Abattoirs rue Chaudron Ropsy',
    zip: '1070',
    city: 'Anderlecht',
    location: '{"type":"Point","coordinates":[4.3272099,50.8428152]}',
    order: 1,
    content:
      'L\'accès à la flotte est géré par [Cultureghem](https://cultureghem.be/fr/accueil/). La flotte des abattoirs d\'Anderlecht est disponible **du lundi au jeudi de 9h à 16h30**.\n\n'
      + '### Vélos disponibles\n\n'
      + '**Flotte d\'apprentissage**\\\n'
      + '11 vélos Altec Metro 26\'\' (taille centre-top 41cm)\n\n'
      + '**Flotte de sortie**\\\n'
      + '8 vélos Oxford Avanti taille S (taille centre-top 43cm)\\\n'
      + '8 vélos Btwin Elops 360 taille M (taille centre-top 48cm)\\\n'
      + '1 vélo Btwin Elops 360 taille L (taille centre-top 51,5cm)\n\n'
      + '### Matériel divers\n\n'
      + 'Cadenas, casques, chasubles, clips pour pantalon, sacoches, plots, pompes, boite à outils\n\n'
      + '### Où faire de la mise en selle ?\n\n'
      + '[De Grote Hal](https://www.google.com/maps/place/De+Grote+Hal/) (à 800m de la flotte)\\\n'
      + 'Quai de l\'industrie 79, 1080 Molenbeek\n\n'
      + '### Des idées de sortie\n\n'
      + '[Boucle de 4km](https://cycle.travel/map/journey/342219)\\\n'
      + '[Boucle de 7,5km](https://cycle.travel/map/journey/342211)\\\n'
      + '[Boucle de 16km](https://cycle.travel/map/journey/342208)',
    translations: {
      nl: {
        title: 'Vloot van de Slachthuizen van Anderlecht',
        street: 'Abattoirs rue Chaudron Ropsy',
        zip: '1070',
        city: 'Anderlecht',
        content:
          'De toegang tot de vloot wordt beheerd door [Cultureghem](https://cultureghem.be/nl/huis/). De vloot is beschikbaar **van maandag tot donderdag tussen 9u en 16u30**.\n\n'
          + '### Beschikbare fietsen\n\n'
          + '**Leer-fietsen**\\\n'
          + '11 fietsen Altec Metro framemaat 26\'\' (center-top 41cm)\n\n'
          + '**Fietstocht-fietsen**\\\n'
          + '8 fietsen Oxford Avanti framemaat S (center-top 43cm)\\\n'
          + '8 fietsen Btwin Elops 360 framemaat M (center-top 48cm)\\\n'
          + '1 fiets Btwin Elops 360 framemaat L (center-top 51,5cm)\n\n'
          + '### Materiaal\n\n'
          + 'Fietssloten, helmen, fluohesjes, broekclips, fietstassen, kegels, pompen, gereedschapskid\n\n'
          + '### Waar kan je leren fietsen?\n\n'
          + '[De Grote Hal](https://www.google.com/maps/place/De+Grote+Hal/) (800m van de vloot)\\\n'
          + 'Nijverheidskaai 79, 1080 Molenbeek\n\n'
          + '### Op zoek naar een fietsroute?\n\n'
          + '[Route van 4km](https://cycle.travel/map/journey/342219)\\\n'
          + '[Route van 7,5km](https://cycle.travel/map/journey/342211)\\\n'
          + '[Route van 16km](https://cycle.travel/map/journey/342208)',
      },
    },
  },

  // ── Evere ─────────────────────────────────────────────────────────────
  {
    title: 'Flotte d\'Evere',
    street: 'Rue Fernand Léger 47',
    zip: '1140',
    city: 'Evere',
    location: '{"type":"Point","coordinates":[4.347782555942949,50.84030544819478]}',
    order: 2,
    content:
      'L\'accès à la flotte se fait via Everecity. Il faut impérativement avoir un rendez-vous fixé avec Everecity pour que quelqu\'un vienne vous ouvrir le garage où se trouve la flotte (les coordonnées de la personne de contact vous seront communiquées par Email une fois la flotte réservée).\n\n'
      + 'La flotte est disponible **du lundi au vendredi entre 9h et 17h**.\n\n'
      + '### Vélos disponibles\n\n'
      + '**Flotte d\'apprentissage**\\\n'
      + '11 vélos Oxford 26\'\' (taille centre-top 38cm)\n\n'
      + '**Flotte de sortie**\\\n'
      + '7 vélos Oxford Avanti taille S (taille centre-top 43cm)\\\n'
      + '7 vélos Btwin Elops 360 taille M (taille centre-top 48cm)\\\n'
      + '1 vélo Btwin Elops 360 taille L (taille centre-top 51,5cm)\n\n'
      + '### Matériel divers\n\n'
      + 'Cadenas, casques, chasubles, clips pour pantalon, sacoches, plots, pompes, boite à outils',
    translations: {
      nl: {
        title: 'Vloot van Evere',
        street: 'Rue Fernand Léger 47',
        zip: '1140',
        city: 'Evere',
        content:
          'L\'accès à la flotte se fait via Everecity. Il faut impérativement avoir un rendez-vous fixé avec Everecity pour que quelqu\'un vienne vous ouvrir le garage où se trouve la flotte (les coordonnées de la personne de contact vous seront communiquées par Email une fois la flotte réservée).\n\n'
          + 'De vloot is beschikbaar **van maandag tot vrijdag tussen 9u en 17u**.\n\n'
          + '### Beschikbare fietsen\n\n'
          + '**Leer-fietsen**\\\n'
          + '11 fietsen Oxford framemaat 26\'\' (center-top 38cm)\n\n'
          + '**Fietstocht-fietsen**\\\n'
          + '7 fietsen Oxford Avanti framemaat S (center-top 43cm)\\\n'
          + '7 fietsen Btwin Elops 360 framemaat M (center-top 48cm)\\\n'
          + '1 fiets Btwin Elops 360 framemaat L (center-top 51,5cm)\n\n'
          + '### Accessoires\n\n'
          + 'Fietssloten, helmen, fluohesjes, broekclips, fietstassen, kegels, pompen, gereedschapskid',
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedVeloSolidaire(options?: {
  teamId?: string
  reset?: boolean
}) {
  const db = useDB()
  const teamId = options?.teamId ?? 'velosolidaire'
  const systemUser = 'system-seed'
  const now = new Date()

  // Reset if requested
  if (options?.reset) {
    await (db as any).delete(pagesPages).where(eq(pagesPages.teamId, teamId))
    await (db as any).delete(bookingsLocations).where(eq(bookingsLocations.teamId, teamId))
  }

  // Insert pages
  const insertedPages = []
  for (const page of PAGES_DATA) {
    const slug = page.slug
    const [inserted] = await (db as any)
      .insert(pagesPages)
      .values({
        teamId,
        owner: systemUser,
        title: page.title,
        slug: `${teamId}-${slug}`,
        pageType: 'core:regular',
        content: page.content,
        config: page.config,
        status: 'published',
        visibility: 'public',
        publishedAt: now,
        showInNavigation: NAV_PAGES.has(slug),
        layout: page.layout,
        order: NAV_ORDER[slug] ?? 99,
        path: '/',
        depth: 0,
        translations: page.translations,
        createdBy: systemUser,
        updatedBy: systemUser,
      })
      .returning()
    insertedPages.push(inserted)
  }

  // Insert locations
  const insertedLocations = []
  for (const loc of LOCATIONS_DATA) {
    const [inserted] = await (db as any)
      .insert(bookingsLocations)
      .values({
        teamId,
        owner: systemUser,
        title: loc.title,
        street: loc.street,
        zip: loc.zip,
        city: loc.city,
        location: loc.location,
        content: loc.content,
        order: loc.order,
        translations: loc.translations,
        createdBy: systemUser,
        updatedBy: systemUser,
      })
      .returning()
    insertedLocations.push(inserted)
  }

  return {
    pages: insertedPages.length,
    locations: insertedLocations.length,
  }
}
