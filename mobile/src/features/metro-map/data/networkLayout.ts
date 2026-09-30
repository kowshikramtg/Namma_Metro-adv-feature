/**
 * Schematic SVG coordinates for Namma Metro network.
 * Layout matches official BMRC route map structure:
 *   - Purple Line runs roughly horizontal (West → East)
 *   - Green Line runs roughly vertical (North → South)
 *   - Lines cross at Majestic (interchange)
 *
 * Coordinates are in a 1000x1400 viewBox.
 * Station positions are hand-tuned for readability.
 */

export interface StationNode {
  id: string;
  name: string;
  x: number;
  y: number;
  line: 'purple' | 'green' | 'yellow' | 'both';
  labelAlign: 'left' | 'right' | 'top' | 'bottom';
}

// Interchange
const MAJESTIC_X = 500;
const MAJESTIC_Y = 700;

export const PURPLE_LINE_NODES: StationNode[] = [
  // West section — slight downward slope toward center
  { id: 'challaghatta', name: 'Challaghatta', x: 50, y: 740, line: 'purple', labelAlign: 'bottom' },
  { id: 'kengeri_bus_terminal', name: 'Kengeri Bus Terminal', x: 90, y: 735, line: 'purple', labelAlign: 'top' },
  { id: 'kengeri', name: 'Kengeri', x: 130, y: 730, line: 'purple', labelAlign: 'bottom' },
  { id: 'pattanagere', name: 'Pattanagere', x: 165, y: 725, line: 'purple', labelAlign: 'top' },
  { id: 'jnanabharathi', name: 'Jnanabharathi', x: 200, y: 720, line: 'purple', labelAlign: 'bottom' },
  { id: 'rajarajeshwari_nagar', name: 'RR Nagar', x: 235, y: 715, line: 'purple', labelAlign: 'top' },
  { id: 'nayandahalli', name: 'Nayandahalli', x: 270, y: 712, line: 'purple', labelAlign: 'bottom' },
  { id: 'mysore_road', name: 'Mysore Road', x: 305, y: 710, line: 'purple', labelAlign: 'top' },
  { id: 'deepanjali_nagar', name: 'Deepanjali Nagar', x: 335, y: 708, line: 'purple', labelAlign: 'bottom' },
  { id: 'attiguppe', name: 'Attiguppe', x: 365, y: 706, line: 'purple', labelAlign: 'top' },
  { id: 'vijayanagar', name: 'Vijayanagar', x: 395, y: 704, line: 'purple', labelAlign: 'bottom' },
  { id: 'hosahalli', name: 'Hosahalli', x: 420, y: 703, line: 'purple', labelAlign: 'top' },
  { id: 'magadi_road', name: 'Magadi Road', x: 445, y: 702, line: 'purple', labelAlign: 'bottom' },
  { id: 'city_railway_station', name: 'City Railway Stn', x: 472, y: 701, line: 'purple', labelAlign: 'top' },
  // Majestic — interchange
  { id: 'nadaprabhu_kempegowda_majestic', name: 'Majestic', x: MAJESTIC_X, y: MAJESTIC_Y, line: 'both', labelAlign: 'right' },
  // East section — slight upward slope then levels
  { id: 'sir_m_visvesvaraya_central_college', name: 'Central College', x: 530, y: 698, line: 'purple', labelAlign: 'bottom' },
  { id: 'dr_br_ambedkar_vidhana_soudha', name: 'Vidhana Soudha', x: 560, y: 696, line: 'purple', labelAlign: 'top' },
  { id: 'cubbon_park', name: 'Cubbon Park', x: 595, y: 694, line: 'purple', labelAlign: 'bottom' },
  { id: 'mg_road', name: 'MG Road', x: 630, y: 692, line: 'purple', labelAlign: 'top' },
  { id: 'trinity', name: 'Trinity', x: 660, y: 690, line: 'purple', labelAlign: 'bottom' },
  { id: 'halasuru', name: 'Halasuru', x: 690, y: 688, line: 'purple', labelAlign: 'top' },
  { id: 'indiranagar', name: 'Indiranagar', x: 720, y: 686, line: 'purple', labelAlign: 'bottom' },
  { id: 'swami_vivekananda_road', name: 'Swami Vivekananda Rd', x: 750, y: 684, line: 'purple', labelAlign: 'top' },
  { id: 'baiyappanahalli', name: 'Baiyappanahalli', x: 780, y: 682, line: 'purple', labelAlign: 'bottom' },
  { id: 'benniganahalli', name: 'Benniganahalli', x: 810, y: 680, line: 'purple', labelAlign: 'top' },
  { id: 'hoodi', name: 'Hoodi', x: 835, y: 678, line: 'purple', labelAlign: 'bottom' },
  { id: 'garudacharpalya', name: 'Garudacharpalya', x: 860, y: 676, line: 'purple', labelAlign: 'top' },
  { id: 'mahadevapura', name: 'Mahadevapura', x: 885, y: 674, line: 'purple', labelAlign: 'bottom' },
  { id: 'krishnarajapura', name: 'Krishnarajapura', x: 905, y: 672, line: 'purple', labelAlign: 'top' },
  { id: 'seetharampalya', name: 'Seetharampalya', x: 920, y: 670, line: 'purple', labelAlign: 'bottom' },
  { id: 'hoodi_junction', name: 'Hoodi Junction', x: 935, y: 668, line: 'purple', labelAlign: 'top' },
  { id: 'channasandra', name: 'Channasandra', x: 950, y: 666, line: 'purple', labelAlign: 'bottom' },
  { id: 'kadugodi_whitefield', name: 'Whitefield', x: 970, y: 664, line: 'purple', labelAlign: 'top' },
];

export const GREEN_LINE_NODES: StationNode[] = [
  // North section — vertical, going south
  { id: 'madavara', name: 'Madavara', x: 490, y: 80, line: 'green', labelAlign: 'right' },
  { id: 'chikkabidarakallu', name: 'Chikkabidarakallu', x: 490, y: 120, line: 'green', labelAlign: 'left' },
  { id: 'manjunathanagar', name: 'Manjunathanagar', x: 490, y: 155, line: 'green', labelAlign: 'right' },
  { id: 'nagasandra', name: 'Nagasandra', x: 492, y: 190, line: 'green', labelAlign: 'left' },
  { id: 'dasarahalli', name: 'Dasarahalli', x: 493, y: 225, line: 'green', labelAlign: 'right' },
  { id: 'jalahalli', name: 'Jalahalli', x: 494, y: 260, line: 'green', labelAlign: 'left' },
  { id: 'peenya_industry', name: 'Peenya Industry', x: 495, y: 295, line: 'green', labelAlign: 'right' },
  { id: 'peenya', name: 'Peenya', x: 496, y: 330, line: 'green', labelAlign: 'left' },
  { id: 'goraguntepalya', name: 'Goraguntepalya', x: 497, y: 365, line: 'green', labelAlign: 'right' },
  { id: 'yeshwanthpur', name: 'Yeshwanthpur', x: 497, y: 400, line: 'green', labelAlign: 'left' },
  { id: 'sandal_soap_factory', name: 'Sandal Soap Factory', x: 498, y: 440, line: 'green', labelAlign: 'right' },
  { id: 'mahalakshmi', name: 'Mahalakshmi', x: 498, y: 475, line: 'green', labelAlign: 'left' },
  { id: 'rajajinagar', name: 'Rajajinagar', x: 499, y: 510, line: 'green', labelAlign: 'right' },
  { id: 'mahakavi_kuvempu_road', name: 'Kuvempu Road', x: 499, y: 545, line: 'green', labelAlign: 'left' },
  { id: 'srirampura', name: 'Srirampura', x: 500, y: 580, line: 'green', labelAlign: 'right' },
  { id: 'sampige_road', name: 'Sampige Road', x: 500, y: 620, line: 'green', labelAlign: 'left' },
  // Majestic — shared with purple (not duplicated, handled in component)
  { id: 'nadaprabhu_kempegowda_majestic', name: 'Majestic', x: MAJESTIC_X, y: MAJESTIC_Y, line: 'both', labelAlign: 'right' },
  // South section
  { id: 'chickpete', name: 'Chickpete', x: 500, y: 740, line: 'green', labelAlign: 'left' },
  { id: 'krishna_rajendra_market', name: 'K.R. Market', x: 500, y: 775, line: 'green', labelAlign: 'right' },
  { id: 'national_college', name: 'National College', x: 501, y: 810, line: 'green', labelAlign: 'left' },
  { id: 'lalbagh', name: 'Lalbagh', x: 502, y: 845, line: 'green', labelAlign: 'right' },
  { id: 'south_end_circle', name: 'South End Circle', x: 503, y: 880, line: 'green', labelAlign: 'left' },
  { id: 'jayanagar', name: 'Jayanagar', x: 504, y: 915, line: 'green', labelAlign: 'right' },
  { id: 'rashtreeya_vidyalaya_road', name: 'RV Road', x: 505, y: 950, line: 'green', labelAlign: 'left' },
  { id: 'banashankari', name: 'Banashankari', x: 506, y: 985, line: 'green', labelAlign: 'right' },
  { id: 'jaya_prakash_nagar', name: 'JP Nagar', x: 507, y: 1020, line: 'green', labelAlign: 'left' },
  { id: 'yelachenahalli', name: 'Yelachenahalli', x: 508, y: 1055, line: 'green', labelAlign: 'right' },
  { id: 'konanakunte_cross', name: 'Konanakunte Cross', x: 509, y: 1090, line: 'green', labelAlign: 'left' },
  { id: 'doddakallasandra', name: 'Doddakallasandra', x: 510, y: 1125, line: 'green', labelAlign: 'right' },
  { id: 'vajarahalli', name: 'Vajarahalli', x: 510, y: 1160, line: 'green', labelAlign: 'left' },
  { id: 'thalaghattapura', name: 'Thalaghattapura', x: 510, y: 1195, line: 'green', labelAlign: 'right' },
  { id: 'silk_institute', name: 'Silk Institute', x: 510, y: 1230, line: 'green', labelAlign: 'left' },
];

export const YELLOW_LINE_NODES: StationNode[] = [
  { id: 'rashtreeya_vidyalaya_road', name: 'RV Road', x: 505, y: 950, line: 'both', labelAlign: 'left' },
  { id: 'ragigudda', name: 'Ragigudda', x: 540, y: 980, line: 'yellow', labelAlign: 'right' },
  { id: 'jayadeva_hospital', name: 'Jayadeva Hospital', x: 575, y: 1010, line: 'yellow', labelAlign: 'right' },
  { id: 'btm_layout', name: 'BTM Layout', x: 610, y: 1040, line: 'yellow', labelAlign: 'right' },
  { id: 'central_silk_board', name: 'Central Silk Board', x: 645, y: 1070, line: 'yellow', labelAlign: 'right' },
  { id: 'bommanahalli', name: 'Bommanahalli', x: 680, y: 1100, line: 'yellow', labelAlign: 'right' },
  { id: 'hongasandra', name: 'Hongasandra', x: 715, y: 1130, line: 'yellow', labelAlign: 'right' },
  { id: 'kudlu_gate', name: 'Kudlu Gate', x: 750, y: 1160, line: 'yellow', labelAlign: 'right' },
  { id: 'singasandra', name: 'Singasandra', x: 785, y: 1190, line: 'yellow', labelAlign: 'right' },
  { id: 'hosa_road', name: 'Hosa Road', x: 820, y: 1220, line: 'yellow', labelAlign: 'right' },
  { id: 'beratena_agrahara', name: 'Beratena Agrahara', x: 855, y: 1250, line: 'yellow', labelAlign: 'right' },
  { id: 'electronic_city', name: 'Electronic City', x: 890, y: 1280, line: 'yellow', labelAlign: 'right' },
  { id: 'infosys_foundation_konappana_agrahara', name: 'Konappana Agrahara', x: 920, y: 1310, line: 'yellow', labelAlign: 'right' },
  { id: 'huskur_road', name: 'Huskur Road', x: 940, y: 1340, line: 'yellow', labelAlign: 'right' },
  { id: 'biocon_hebbagodi', name: 'Hebbagodi', x: 955, y: 1370, line: 'yellow', labelAlign: 'right' },
  { id: 'delta_electronics_bommasandra', name: 'Bommasandra', x: 970, y: 1400, line: 'yellow', labelAlign: 'right' },
];

/** All nodes merged, Majestic deduplicated */
export const ALL_NODES: StationNode[] = (() => {
  const map = new Map<string, StationNode>();
  PURPLE_LINE_NODES.forEach((n) => map.set(n.id, n));
  GREEN_LINE_NODES.forEach((n) => {
    if (!map.has(n.id)) map.set(n.id, n);
  });
  YELLOW_LINE_NODES.forEach((n) => {
    if (!map.has(n.id)) map.set(n.id, n);
  });
  return Array.from(map.values());
})();

export const getNodeById = (id: string): StationNode | undefined =>
  ALL_NODES.find((n) => n.id === id);

export const VIEWBOX = { width: 1020, height: 1460 };

export const LINE_COLORS = {
  purple: '#7B2D8E',
  green: '#4CAF50',
  yellow: '#FFC107',
} as const;
