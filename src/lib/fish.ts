export type FishId =
  | 'any'
  | 'pike'
  | 'zander'
  | 'perch'
  | 'carp'
  | 'crucian'
  | 'bream'
  | 'roach'
  | 'catfish'

export type Period = 'dawn' | 'day' | 'dusk' | 'night'

export type FishProfile = {
  id: FishId
  name: string
  /** Genitive form for sentences like "кльов щуки". */
  genitive: string
  kind: 'predator' | 'peaceful' | 'mixed'
  /** Optimal water temperature range, °C. */
  tempOpt: [number, number]
  /** Below this water temperature the fish is nearly passive. */
  tempMin: number
  /** Activity bonus by time of day (score points). */
  activity: Record<Period, number>
  /** Overcast sky helps (predators hunt better in dim light). */
  likesClouds: boolean
  /** Light rain helps. */
  likesLightRain: boolean
  baits: { cold: string[]; warm: string[] }
  tips: string[]
}

export const FISH: FishProfile[] = [
  {
    id: 'any',
    name: 'Будь-яка риба',
    genitive: 'риби',
    kind: 'mixed',
    tempOpt: [12, 22],
    tempMin: 4,
    activity: { dawn: 12, day: 0, dusk: 10, night: -6 },
    likesClouds: true,
    likesLightRain: true,
    baits: {
      cold: ['мотиль', 'опариш', 'дрібний воблер', 'мормишка'],
      warm: ['черв’як', 'кукурудза', 'тісто', 'силіконова приманка'],
    },
    tips: [
      'Почніть з перспективних місць: брівки, межа очерету, ями біля берега.',
      'Якщо 30–40 хвилин немає клювання — змініть точку або приманку.',
    ],
  },
  {
    id: 'pike',
    name: 'Щука',
    genitive: 'щуки',
    kind: 'predator',
    tempOpt: [8, 18],
    tempMin: 2,
    activity: { dawn: 14, day: 4, dusk: 10, night: -12 },
    likesClouds: true,
    likesLightRain: true,
    baits: {
      cold: ['живець (плотва, карась)', 'джиг-приманки 10–14 см', 'важкі колебалки'],
      warm: ['воблер-мінноу', 'спінер №3–4', 'незачіпляйка біля трави', 'поверхневі приманки'],
    },
    tips: [
      'Шукайте щуку на межі трави та чистої води, біля коряжника.',
      'У похмуру погоду використовуйте яскраві приманки, у сонячну — натуральні.',
      'Восени щука спускається глибше — облавлюйте свали та бровки.',
    ],
  },
  {
    id: 'zander',
    name: 'Судак',
    genitive: 'судака',
    kind: 'predator',
    tempOpt: [10, 20],
    tempMin: 3,
    activity: { dawn: 12, day: -2, dusk: 14, night: 8 },
    likesClouds: true,
    likesLightRain: false,
    baits: {
      cold: ['джиг з поролоновою рибкою', 'віброхвіст 8–10 см', 'живець на дні'],
      warm: ['твістер', 'воблер з заглибленням', 'дрібний живець вночі'],
    },
    tips: [
      'Судак тримається твердого дна, ракушняку та свалів русла.',
      'Найкращі години — сутінки та ніч, особливо на мілинах біля ям.',
    ],
  },
  {
    id: 'perch',
    name: 'Окунь',
    genitive: 'окуня',
    kind: 'predator',
    tempOpt: [10, 22],
    tempMin: 2,
    activity: { dawn: 10, day: 8, dusk: 6, night: -14 },
    likesClouds: false,
    likesLightRain: false,
    baits: {
      cold: ['мормишка з мотилем', 'мікроджиг', 'балансир'],
      warm: ['вертушка №1–2', 'мікроджиг', 'черв’як на поплавок', 'дрібні воблери'],
    },
    tips: [
      'Окунь — денна риба: найактивніший у ясні тихі дні при стабільному тиску.',
      'Шукайте «котли» — сплески малька на поверхні.',
    ],
  },
  {
    id: 'carp',
    name: 'Короп',
    genitive: 'коропа',
    kind: 'peaceful',
    tempOpt: [18, 28],
    tempMin: 10,
    activity: { dawn: 14, day: -2, dusk: 8, night: 8 },
    likesClouds: false,
    likesLightRain: true,
    baits: {
      cold: ['дрібні пелетс', 'кукурудза', 'черв’як', 'поп-ап з ароматом риби'],
      warm: ['бойли', 'кукурудза', 'горох', 'макуха', 'пелетс'],
    },
    tips: [
      'Підгодовуйте точку заздалегідь — короп ходить маршрутами.',
      'У спеку ловіть рано вранці, ввечері та вночі на глибших ділянках.',
    ],
  },
  {
    id: 'crucian',
    name: 'Карась',
    genitive: 'карася',
    kind: 'peaceful',
    tempOpt: [17, 27],
    tempMin: 8,
    activity: { dawn: 14, day: 2, dusk: 8, night: -6 },
    likesClouds: false,
    likesLightRain: true,
    baits: {
      cold: ['мотиль', 'опариш', 'черв’як'],
      warm: ['тісто з часником', 'манка', 'перловка', 'черв’як', 'хліб'],
    },
    tips: [
      'Карась любить тиху, стоячу воду біля очерету та латаття.',
      'При безвітряній теплій погоді клювання найкраще з самого ранку.',
    ],
  },
  {
    id: 'bream',
    name: 'Лящ',
    genitive: 'ляща',
    kind: 'peaceful',
    tempOpt: [12, 22],
    tempMin: 6,
    activity: { dawn: 10, day: -4, dusk: 12, night: 10 },
    likesClouds: true,
    likesLightRain: true,
    baits: {
      cold: ['мотиль', 'опариш', 'бутерброд мотиль+опариш'],
      warm: ['перловка', 'кукурудза', 'черв’як', 'горох'],
    },
    tips: [
      'Лящ тримається глибоких ям і ходить зграєю — потрібна щільна підгодовка.',
      'Фідер на 30–60 м і дальше — класика для ляща.',
    ],
  },
  {
    id: 'roach',
    name: 'Плотва',
    genitive: 'плотви',
    kind: 'peaceful',
    tempOpt: [8, 20],
    tempMin: 2,
    activity: { dawn: 10, day: 6, dusk: 8, night: -10 },
    likesClouds: true,
    likesLightRain: true,
    baits: {
      cold: ['мотиль', 'опариш', 'мормишка'],
      warm: ['опариш', 'тісто', 'перловка', 'хліб'],
    },
    tips: [
      'Плотва активна навіть у прохолодну погоду — відмінна ціль восени.',
      'Використовуйте тонку оснастку та дрібні гачки (№14–18).',
    ],
  },
  {
    id: 'catfish',
    name: 'Сом',
    genitive: 'сома',
    kind: 'predator',
    tempOpt: [20, 28],
    tempMin: 12,
    activity: { dawn: 6, day: -10, dusk: 10, night: 16 },
    likesClouds: true,
    likesLightRain: true,
    baits: {
      cold: ['живець', 'жмут черв’яків'],
      warm: ['живець', 'жаба', 'печінка', 'жмут виповзків', 'квок'],
    },
    tips: [
      'Сом — нічний мисливець: виходить з ям на мілини після заходу сонця.',
      'Перед грозою і в задушливу погоду сом особливо активний.',
    ],
  },
]

export const fishById = (id: FishId) => FISH.find((f) => f.id === id) ?? FISH[0]
