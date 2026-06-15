import { contentArticles } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

// Slug mapping from old site (alexdeforce.com) — matched by title
const SLUG_MAP: Record<string, string> = {
  // Poezie
  'Morgen De Knoop - Driezits': 'morgen-de-knoop-driezits',
  'Tot nu toe': 'tot-nu-toe',
  // Two articles with same title "Morgen De Knoop - Simpele dingen" — one has -1 suffix
  'Morgen De Knoop - En dan de crisis': 'morgen-de-knoop-en-dan-de-crisis',
  'Zij - live at Ancienne Belgique': 'zij-live-at-ancienne-belgique',
  'Spiritjuweel I: Kwart Voor Straks': 'spiritjuweel-i-kwart-voor-straks',
  'La Loge - live solo set (MuseumNightFever \'24)': 'la-loge-live-solo-set-museumnightfever-24',
  'Tussenbruggen (Poëziecentrum)': 'tussenbruggen-poeziecentrum',
  'Lelijke Zomers': 'lelijke-zomers',
  'Kwart Voor Straks (2024, Stroom)': 'kwart_voor_straks_2024_stroom',
  'Turquoise - AB Sessions (live w/ Charlotte Jacobs)': 'turquoise_-_ab_sessions',
  'Umami (w/ Charlotte Jacobs - Stroom, 2023)': 'umami_w_charlotte_jacobs_-_stroom_2023',
  'Live in Rotterdam (dj-set + poëzie/ Museumnacht, Roodkapje)': 'live_in_rotterdam_dj-set_poezie_museumnacht_roodkapje',
  'Tussenbruggen - tour': 'tussenbruggen_-_tour',
  'Hoek van de laatste zon - video': 'hoek_van_de_laatste_zon_-_video',
  'Tussenbruggen (Paulo Rietjens & Alex Deforce - LED002)': 'tussenbruggen',
  'Hoek van de laatste zon (Victor De Roo & Alex Deforce - LED001)': 'hoek_van_de_laatste_zon',
  'Sur Le Pont': 'sur_le_pont',
  'Une fois Molem (KlaraFestival)': 'une_fois_molem_klarafestival',
  'Nachtdichter': 'nachtdichter',
  'Zij / Goesting': 'zij_goesting',
  'Re:Folies Bar': 're_folies_bar',
  'Ode Aan De Nacht': 'ode_aan_de_nacht',
  'Komma': 'komma',
  'Ewewig': 'ewewig',
  'Voorbenachte Rade': 'voorbenachte_rade',
  'Live at De Graaf, Ghent': 'live_at_de_graaf_ghent',
  'Live for De Brakke Grond/The Word': 'live_at_de_brakke_grond_the_word',
  'Dichters van Wacht - We Zouden Naar Zee Gaan': 'dichters_van_wacht_-_we_zouden_naar_zee_gaan',
  'Klimaatdichters - Zwemlessen voor later': 'klimaatdichters_-_zwemlessen_voor_later',
  'De Sprekende Ezels - kalender 2022': 'de_sprekende_ezels_-_kalender_2022',
  'De Sprekende Ezels - kalender 2021': 'de_sprekende_ezels_-_kalender_2021',
  'De Sprekende Ezels - kalender 2020': 'de_sprekende_ezels_-_kalender_2020',

  // Txt
  'Nieuwjaarsbrief 2026': 'nieuwjaarsbrief-2026',
  'Vuur en vergetelheid: geld in de fik herinnerd': 'vuur-en-vergetelheid-geld-in-de-fik-herinnerd',
  'Uit Het Dagboek Van De Verloren Gewaande Ghostwriter van De Nooit Moede': 'uit-het-dagboek-van-de-verloren-gewaande-ghostwriter-van-de-nooit-moede',
  'De Haan': 'de_haan',
  'Parc Royal': 'parc_royal',
  'Koning van de Nostalgie': 'koning_van_de_nostalgie',
  'Bootleg Paintings': 'bootleg_paintings',
  'Benjamin Lew liner notes': 'benjamin_lew_liner_notes',
  '48 Cameras liner notes': '48_cameras',
  'Chet Baker - Finest': 'chet_baker_-_finest',

  // Img
  'Brede lach': 'brede_lach',
  '20 jaar Het Liegend Konijn': 'de_standaard_der_letteren_28_05_2022',
  'Crucifixion of St. Peter (after Caravaggio)': 'crucifixion_of_st-_peter_after_caravaggio',
  'Madison Washington': 'madison_washington',
  'Inkswel - Unity 4 Utopia (BBE)': 'inkswel_-_unity_4_utopia_bbe',
  'Montasser Aalde\'emeh': 'montasser_aaldeemeh',
  'Gaea Schoeters x Caresse Crosby': 'gaea_schoeters_x_caresse_crosby',
  'Ilja Leonard Pfeijffer x Sappho': 'ilja_leonard_pfeijffer_x_sappho',
  'Michiel Hendryckx x Giacomo Casanova': 'michiel_hendryckx_x_giacomo_casanova',
  'Pascale Platel x Ted Bundy': 'pascale_platel_x_ted_bundy',
  'Bernard Dewulf x Edward Hopper': 'bernard_dewulf_x_edward_hopper',
  'Fikry El Azzouzi x Malcolm X': 'fikry_el_azzouzi_x_malcolm_x',
  'Delphine Lecompte x Humphrey Bogart': 'delphine_lecompte_x_humphrey_bogart',
  'Bruno Vanden Broecke x Jim Henson': 'bruno_vanden_broecke_x_jim_henson',
  'Herman Brusselmans x John Bonham': 'herman_brusselmans_x_john_bonham',
  'Al Pacino': 'al_pacino',
  'Malik Ameer Crumpler': 'malik_ameer_crumpler',
  'Dirk De Wachter': 'dirk_de_wachter',
  'Wolfgang Schäuble': 'wolfgang_schauble',
  'Luc De Vos': 'luc_de_vos',
  'Joke Schauvliege': 'joke_schauvliege',
  'Wouter Beke': 'wouter_beke',
  'Geert Bourgeois': 'geert_bourgeois',
  'Jean-Claude Juncker': 'jean-claude_juncker',
  'Edward Snowden': 'edward_snowden',
  'Nelson Mandela x Barack Obama': 'nelson_mandela_x_barack_obama',
  'Tribute to Hiro': 'tribute_to_hiro',

  // Radio
  'Nonchalance Calculée - Ep.58 (w/ Nicolas Van Belle)': 'nonchalance-calculee-ep-58-w-nicolas-van-belle',
  'Nonchalance Calculée - Ep.57 (w/ Suzan Peeters)': 'nonchalance-calculee-ep-57-w-suzan-peeters',
  'Nonchalance Calculée - Ep.56 (w/ Serge Van Duijnhoven)': 'nonchalance-calculee-ep-56-w-serge-van-duijnhoven',
  'Nonchalance Calculée - Ep.55 (w/ Maya Mertens aka Vieze Meisje)': 'nonchalance-calculee-ep-55-w-maya-mertens-aka-vieze-meisje',
  'Nonchalance Calculée - Ep.54 (w/ Jean-Michel Van Schouwburg & burger service)': 'nonchalance-calculee-ep-54-w-jean-michel-van-schouwburg-burger-service',
  'Nonchalance Calculée - Ep.53': 'nonchalance-calculee-ep-53',
  'Nonchalance Calculée - Ep.52': 'nonchalance-calculee-ep-52',
  'Nonchalance Calculée - Ep.51': 'nonchalance-calculee-ep-51',
  'Nonchalance Calculée - Ep.50': 'nonchalance-calculee-ep-50',
  'Nonchalance Calculée - Ep.49': 'nonchalance-calculee-ep-49',
  'Nonchalance Calculée - Ep.48': 'nonchalance-calculee-ep-48',
  'Nonchalance Calculée - Ep.47': 'nonchalance-calculee-ep-47',
  'Nonchalance Calculée - Ep.46 (w/ De Pauw en De Pauw)': 'nonchalance-calculee-ep-46-w-de-pauw-de-pauw',
  'Nonchalance Calculée - Ep.45': 'nonchalance-calculee-ep-45',
  'Nonchalance Calculée - Ep.44 (w/ Edgar Wappenhalter & Frank Keizer)': 'nonchalance-calculee-ep-44-w-edgar-wappenhalter-frank-keizer',
  'Nonchalance Calculée - Ep.43': 'nonchalance-calculee-ep-43',
  'Nonchalance Calculée - Ep.42 (w/ Low G)': 'nonchalance-calculee-ep-42',
  'Nonchalance Calculée - Ep.41': 'nonchalance-calculee-ep-41',
  'Nonchalance Calculée - Ep.40': 'nonchalance-calculee-ep-40',
  'Nonchalance Calculée - Ep.39 (w/ Victor Verhelst)': 'nonchalance-calculee-ep-39-w-victor-verhelst',
  'Nonchalance Calculée - Ep.38 (w/ Dounia Mahammed)': 'nonchalance-calculee-ep-38-w-dounia-mahammed',
  'Nonchalance Calculée - Ep.37 (w/ Noodzakelijk Kwaad)': 'nonchalance_calculee_-_ep-37_w_noodzakelijk_kwaad',
  'Nonchalance Calculée - Ep.36': 'nonchalance_calculee_-_ep-36',
  'Nonchalance Calculée - Ep.35': 'nonchalance_calculee_-_ep-35',
  'Guest show + interview on Mu, Radio Campus': 'guest_show_interview_on_mu_radio_campus',
  'Nonchalance Calculée - Ep.34 (w/ Cor Gout & Unit Moebius)': 'nonchalance_calculee_-_ep-34_w_cor_gout_unit_moebius',
  'Live Bundel IV at Midnight Vultures': 'nonchalance_calculee_ep-34_-_live_bundel_iv',
  'Nonchalance Calculée - Ep.33 (w/ Jeanna Criscitiello)': 'nonchalance_calculee_-_ep-33_w_jeanna_criscitiello',
  'Nonchalance Calculée - Ep.32 (w/ Charlène Darling)': 'nonchalance_calculee_-_ep-32_w_charlene_darling',
  'Nonchalance Calculée - Ep.31 (w/ Sergeant & burger service)': 'nonchalance_calculee_-_ep-31_w_sergeant_burger_service',
  'Nonchalance Calculée - Ep.30': 'nonchalance_calculee_-_ep-30',
  'Nonchalance Calculée - Ep.29': 'nonchalance_calculee_-_ep-28_1',
  'Nonchalance Calculée - Ep.28': 'nonchalance_calculee_-_ep-28',
  'Nonchalance Calculée - Ep.27': 'nonchalance_calculee_-_ep-27',
  'Nonchalance Calculée - Ep.26': 'nonchalance_calculee_-_ep-26',
  'Nonchalance Calculée - Ep.25': 'nonchalance_calculee_ep-25',
  'Live Bundel II at Radio Tempo Não Pára / TNP (Amsterdam)': 'live_bundel_ii_at_radio_tempo_nao_para_tnp_amsterdam',
  'Live Bundel I at WeAreVarious Radio (Bosbar, Antwerp)': 'live_poetry_at_wearevarious_radio_bosbar_antwerp',
  'Nonchalance Calculée - Ep.24 (ft. Azertyklavierwerke)': 'nonchalance_calculee_-_ep-24_ft-_azertyklavierwerke',
  'Nonchalance Calculée - Ep.23 (ft. Tussenbruggen live)': 'nonchalance_calculee_-_ep-23_ft-_tussenbruggen_live',
  'Nonchalance Calculée - Ep.22': 'nonchalance_calculee_-_ep-22',
  'Sloppy guestmix at Villa Bota': 'slopy_guestmix_at_villa_bota',
  'Nonchalance Calculée - Ep.21': 'nonchalance_calculee_-_ep-21',
  'Nonchalance Calculée - Ep.20': 'nonchalance_calculee_-_ep-20',
  'Nonchalance Calculée - Ep.19 (ft. Rachel Sassi & José Gsell)': 'nonchalance_calculee_-_ep-19_ft-_rachel_sassi_jose_gsell',
  'Watou 2022 Poëzieradio - Teaser': 'watou_2022_poezieradio_-_teaser',
  'Nonchalance Calculée - Ep.18 (ft. Anus De Band, Lara Chedraoui & Frank Keizer)': 'nonchalance_calculee_-_ep-18_ft-_anus_de_band_lara_chedraoui_frank_keizer',
  'Nonchalance Calculée - Ep.17': 'nonchalance_calculee_-_ep-17',
  'Nonchalance Calculée - Ep.16': 'nonchalance_calculee_-_ep-16',
  'Nonchalance Calculée - Ep.15': 'nonchalance_calculee_-_ep-15',
  'Nonchalance Calculée - Ep.14': 'nonchalance_calculee_-_ep-14',
  'Nonchalance Calculée - Ep.13 (Christmas Special)': 'nonchalance_calculee_-_ep-13_christmas_special',
  'Nonchalance Calculée - Ep.12': 'nonchalance_calculee_-_ep-12',
  'Nonchalance Calculée - Ep.11': 'nonchalance_calculee_-_ep-11',
  'Nonchalance Calculée - Ep.10 (ft. Charlotte Jacobs & Alec Ilyine)': 'nonchalance_calculee_-_ep-10',
  'Nonchalance Calculée - Ep.09': 'nonchalance_calculee_-_ep-09',
  'Nonchalance Calculée - Ep.08': 'nonchalance_calculee_-_ep-08',
  'Nonchalance Calculée - Ep.07': 'nonchalance_calculee_-_ep-07',
  'Nonchalance Calculée - Ep.06': 'nonchalance_calculee_-_ep-06',
  'Nonchalance Calculée - Ep.05': 'nonchalance_calculee_-_ep-05',
  'Nonchalance Calculée - Ep.04': 'nonchalance_calculee_-_ep-04',
  'Nonchalance Calculée - Ep.03': 'nonchalance_calculee_-_ep-03',
  'Nonchalance Calculée - Ep.02': 'nonchalance_calculee_-_ep-02',
  'Nonchalance Calculée - Ep.01': 'nonchalance_calculee_-_ep-01',
  'Passa Porta Literatuurmix': 'passa_porta_literatuurmix',
  'Great, Life is Great, When Drunk with... - Ep.21': 'great_life_is_great_when_drunk_with-_-_ep-21',
  'Great, Life is Great, When Drunk with... - Ep.20': 'great_life_is_great_when_drunk_with-_-_ep-20',
  'Great, Life is Great, When Drunk with... - Ep.19': 'great_life_is_great_when_drunk_with-_-_ep-19',
  'Great, Life is Great, When Drunk with... - Ep.18': 'great_life_is_great_when_drunk_with-_-_ep-18',
  'Great, Life is Great, When Drunk with... - Ep.17': 'great_life_is_great_when_drunk_with-_-_ep-17',
  'Great, Life is Great, When Drunk with... - Ep.16': 'great_life_is_great_when_drunk_with-_-_ep-16',
  'Great, Life is Great, When Drunk with... - Ep.15': 'great_life_is_great_when_drunk_with-_-_ep-15',
  'Great, Life is Great, When Drunk with... - Ep.14': 'great_life_is_great_when_drunk_with-_-_ep-14',
  'Great, Life is Great, When Drunk with... - Ep.13': 'great_life_is_great_when_drunk_with-_-_ep-13',
  'Great, Life is Great, When Drunk with... - Ep.12': 'great_life_is_great_when_drunk_with-_-_ep-12',
  'Great, Life is Great, When Drunk with... - Ep.11': 'great_life_is_great_when_drunk_with-_-_ep-11',
  'Great, Life is Great, When Drunk with... - Ep.10': 'great_life_is_great_when_drunk_with-_-_ep-10',
  'Great, Life is Great, When Drunk with... - Ep.09': 'great_life_is_great_when_drunk_with-_-_ep-09',
  'Great, Life is Great, When Drunk with... - Ep.08': 'great_life_is_great_when_drunk_with-_-_ep-08',
  'Great, Life is Great, When Drunk with... - Ep.07': 'great_life_is_great_when_drunk_with-_-_ep-07',
  'Great, Life is Great, When Drunk with... - Ep.06': 'great_life_is_great_when_drunk_with-_-_ep-06',
  'Great, Life is Great, When Drunk with... - Ep.05': 'great_life_is_great_when_drunk_with-_-_ep-05',
  'Great, Life is Great, When Drunk with... - Ep.04': 'great_life_is_great_when_drunk_with-_-_ep-04',
  'Great, Life is Great, When Drunk with... - Ep.03': 'great_life_is_great_when_drunk_with-_-_ep-03',
  'Great, Life is Great, When Drunk with... - Ep.02': 'great_life_is_great_when_drunk_with-_-_ep-02',
  'Great, Life is Great, When Drunk with... - Ep.01': 'great_life_is_great_when_drunk_with-_-_ep-01',
  'The Word x Lose It In The City - b2b Victor De Roo': 'the_word_x_lose_it_in_the_city_-_b2b_victor_de_roo',
  'The Word at Wiels': 'the_word_at_wiels',
}

// Handle duplicate titles — "Autobiografie van een Koer" appears twice,
// and "Morgen De Knoop - Simpele dingen" appears twice.
// We'll track seen titles and use _1 suffix for the second occurrence.
const DUPLICATE_SLUGS: Record<string, string[]> = {
  'Autobiografie van een Koer': ['autobiografie_van_een_koer', 'autobiografie_van_een_koer_1'],
  'Morgen De Knoop - Simpele dingen': ['morgen-de-knoop-simpele-dingen', 'morgen-de-knoop-simpele-dingen-1'],
}

export default defineEventHandler(async () => {
  const db = useDB()

  const articles = await db.select().from(contentArticles)

  const updated: string[] = []
  const unmatched: string[] = []
  const duplicateCounters: Record<string, number> = {}

  for (const article of articles) {
    let newSlug: string | undefined

    // Check duplicates first
    if (DUPLICATE_SLUGS[article.title]) {
      const count = duplicateCounters[article.title] || 0
      newSlug = DUPLICATE_SLUGS[article.title][count]
      duplicateCounters[article.title] = count + 1
    } else {
      newSlug = SLUG_MAP[article.title]
    }

    if (newSlug) {
      await db
        .update(contentArticles)
        .set({ slug: newSlug })
        .where(eq(contentArticles.id, article.id))
      updated.push(`${article.title} → ${newSlug}`)
    } else {
      unmatched.push(article.title)
    }
  }

  return {
    updated: updated.length,
    unmatched,
    details: updated,
  }
})