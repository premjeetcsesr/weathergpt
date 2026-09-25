/**
 * Indian Cities to State Knowledge Base & Comprehensive Localities Mapping
 */

export const CITY_STATE_MAP = {
  // Maharashtra
  pune: 'Maharashtra',
  mumbai: 'Maharashtra',
  bombay: 'Maharashtra',
  thane: 'Maharashtra',
  'navi mumbai': 'Maharashtra',
  nagpur: 'Maharashtra',
  nashik: 'Maharashtra',
  aurangabad: 'Maharashtra',
  solapur: 'Maharashtra',
  kolhapur: 'Maharashtra',
  amravati: 'Maharashtra',

  // Karnataka
  bengaluru: 'Karnataka',
  bangalore: 'Karnataka',
  mysuru: 'Karnataka',
  mysore: 'Karnataka',
  mangalore: 'Karnataka',
  hubli: 'Karnataka',
  belgaum: 'Karnataka',

  // Telangana & Andhra Pradesh
  hyderabad: 'Telangana',
  secunderabad: 'Telangana',
  warangal: 'Telangana',
  visakhapatnam: 'Andhra Pradesh',
  vijayawada: 'Andhra Pradesh',
  guntur: 'Andhra Pradesh',
  tirupati: 'Andhra Pradesh',

  // Tamil Nadu
  chennai: 'Tamil Nadu',
  madras: 'Tamil Nadu',
  coimbatore: 'Tamil Nadu',
  madurai: 'Tamil Nadu',
  tiruchirappalli: 'Tamil Nadu',
  salem: 'Tamil Nadu',

  // West Bengal
  kolkata: 'West Bengal',
  calcutta: 'West Bengal',
  howrah: 'West Bengal',
  durgapur: 'West Bengal',
  siliguri: 'West Bengal',
  asansol: 'West Bengal',

  // Gujarat
  ahmedabad: 'Gujarat',
  surat: 'Gujarat',
  vadodara: 'Gujarat',
  rajkot: 'Gujarat',
  gandhinagar: 'Gujarat',
  bhavnagar: 'Gujarat',

  // Rajasthan
  jaipur: 'Rajasthan',
  jodhpur: 'Rajasthan',
  udaipur: 'Rajasthan',
  kota: 'Rajasthan',
  bikaner: 'Rajasthan',
  ajmer: 'Rajasthan',

  // Delhi NCR
  delhi: 'Delhi',
  'new delhi': 'Delhi',

  // Uttar Pradesh
  kanpur: 'Uttar Pradesh',
  lucknow: 'Uttar Pradesh',
  noida: 'Uttar Pradesh',
  'greater noida': 'Uttar Pradesh',
  ghaziabad: 'Uttar Pradesh',
  varanasi: 'Uttar Pradesh',
  banaras: 'Uttar Pradesh',
  kashi: 'Uttar Pradesh',
  prayagraj: 'Uttar Pradesh',
  allahabad: 'Uttar Pradesh',
  agra: 'Uttar Pradesh',
  meerut: 'Uttar Pradesh',
  bareilly: 'Uttar Pradesh',
  aligarh: 'Uttar Pradesh',
  moradabad: 'Uttar Pradesh',
  gorakhpur: 'Uttar Pradesh',
  jhansi: 'Uttar Pradesh',
  mathura: 'Uttar Pradesh',
  ayodhya: 'Uttar Pradesh',
  faizabad: 'Uttar Pradesh',
  saharanpur: 'Uttar Pradesh',
  firozabad: 'Uttar Pradesh',

  // Bihar
  patna: 'Bihar',
  gaya: 'Bihar',
  bhagalpur: 'Bihar',
  muzaffarpur: 'Bihar',
  darbhanga: 'Bihar',

  // Madhya Pradesh
  bhopal: 'Madhya Pradesh',
  indore: 'Madhya Pradesh',
  gwalior: 'Madhya Pradesh',
  jabalpur: 'Madhya Pradesh',
  ujjain: 'Madhya Pradesh',

  // Punjab & Chandigarh
  chandigarh: 'Chandigarh',
  mohali: 'Punjab',
  ludhiana: 'Punjab',
  amritsar: 'Punjab',
  jalandhar: 'Punjab',
  patiala: 'Punjab',

  // Uttarakhand
  dehradun: 'Uttarakhand',
  haridwar: 'Uttarakhand',
  rishikesh: 'Uttarakhand',
  roorkee: 'Uttarakhand',
  nainital: 'Uttarakhand',

  // Himachal Pradesh
  shimla: 'Himachal Pradesh',
  manali: 'Himachal Pradesh',
  dharamshala: 'Himachal Pradesh',

  // Jammu & Kashmir
  srinagar: 'Jammu and Kashmir',
  jammu: 'Jammu and Kashmir',

  // Jharkhand
  ranchi: 'Jharkhand',
  jamshedpur: 'Jharkhand',
  dhanbad: 'Jharkhand',

  // Chhattisgarh
  raipur: 'Chhattisgarh',
  bilaspur: 'Chhattisgarh',

  // Odisha
  bhubaneswar: 'Odisha',
  cuttack: 'Odisha',
  puri: 'Odisha',

  // Assam & Northeast
  guwahati: 'Assam',
  silchar: 'Assam',
  shillong: 'Meghalaya',

  // Kerala
  kochi: 'Kerala',
  cochin: 'Kerala',
  thiruvananthapuram: 'Kerala',
  trivandrum: 'Kerala',
  kozhikode: 'Kerala',

  // Goa
  panaji: 'Goa',
  goa: 'Goa'
};

/**
 * Returns accurate state name for a given city
 */
export function getStateForCity(city) {
  if (!city) return '';
  const clean = city.toLowerCase().trim().replace(/[^a-z\s]/g, '');
  
  if (CITY_STATE_MAP[clean]) {
    return CITY_STATE_MAP[clean];
  }

  // Substring matching
  for (const [key, state] of Object.entries(CITY_STATE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return state;
    }
  }

  return '';
}

/**
 * Detailed popular localities with their respective verified state and postal code
 */
export const CITY_LOCALITIES_CATALOG = {
  pune: {
    state: 'Maharashtra',
    localities: [
      { name: 'Viman Nagar', pincode: '411014', tag: 'Airport East / IT' },
      { name: 'Hinjewadi', pincode: '411057', tag: 'Rajiv Gandhi Infotech Park' },
      { name: 'Kothrud', pincode: '411038', tag: 'West Pune' },
      { name: 'Baner', pincode: '411045', tag: 'West Corridor' },
      { name: 'Wakad', pincode: '411057', tag: 'Pimpri-Chinchwad' },
      { name: 'Koregaon Park', pincode: '411001', tag: 'Central / High Street' },
      { name: 'Shivaji Nagar', pincode: '411005', tag: 'City Hub' },
      { name: 'Hadapsar (Magarpatta)', pincode: '411028', tag: 'Cybercity IT' },
      { name: 'Aundh', pincode: '411007', tag: 'North West' },
      { name: 'Kalyani Nagar', pincode: '411006', tag: 'East' },
      { name: 'Pimpri', pincode: '411018', tag: 'Industrial' }
    ]
  },
  mumbai: {
    state: 'Maharashtra',
    localities: [
      { name: 'Bandra West', pincode: '400050', tag: 'Western Suburbs' },
      { name: 'Andheri East', pincode: '400069', tag: 'Commercial Hub' },
      { name: 'South Mumbai (Fort)', pincode: '400001', tag: 'Downtown' },
      { name: 'Powai', pincode: '400076', tag: 'IIT / Tech Hub' },
      { name: 'Borivali', pincode: '400092', tag: 'North Mumbai' },
      { name: 'Dadar', pincode: '400014', tag: 'Central' },
      { name: 'Juhu', pincode: '400049', tag: 'Coastal' },
      { name: 'Colaba', pincode: '400005', tag: 'South' },
      { name: 'Malad West', pincode: '400064', tag: 'Suburbs' },
      { name: 'Thane West', pincode: '400601', tag: 'Central Metro' },
      { name: 'Navi Mumbai (Vashi)', pincode: '400703', tag: 'Trans-Harbour' }
    ]
  },
  bengaluru: {
    state: 'Karnataka',
    localities: [
      { name: 'Koramangala', pincode: '560034', tag: 'Startup Hub' },
      { name: 'Indiranagar', pincode: '560038', tag: 'East' },
      { name: 'Whitefield', pincode: '560066', tag: 'Tech Corridor' },
      { name: 'HSR Layout', pincode: '560102', tag: 'South East' },
      { name: 'Electronic City', pincode: '560100', tag: 'IT Hub Phase 1' },
      { name: 'Jayanagar', pincode: '560041', tag: 'South' },
      { name: 'Malleshwaram', pincode: '560003', tag: 'Heritage West' },
      { name: 'Bellandur', pincode: '560103', tag: 'Outer Ring Road' },
      { name: 'Marathahalli', pincode: '560037', tag: 'East Transit' }
    ]
  },
  delhi: {
    state: 'Delhi',
    localities: [
      { name: 'Connaught Place', pincode: '110001', tag: 'Central Delhi' },
      { name: 'Hauz Khas', pincode: '110016', tag: 'South Delhi' },
      { name: 'Dwarka', pincode: '110075', tag: 'South West' },
      { name: 'Rohini', pincode: '110085', tag: 'North West' },
      { name: 'Karol Bagh', pincode: '110005', tag: 'Central Delhi' },
      { name: 'Saket', pincode: '110017', tag: 'South Delhi' },
      { name: 'Chandni Chowk', pincode: '110006', tag: 'Old Delhi' },
      { name: 'Lajpat Nagar', pincode: '110024', tag: 'South Delhi' },
      { name: 'Vasant Kunj', pincode: '110070', tag: 'South Delhi' },
      { name: 'Pitampura', pincode: '110034', tag: 'North West' }
    ]
  },
  kanpur: {
    state: 'Uttar Pradesh',
    localities: [
      { name: 'Kalyanpur', pincode: '208017', tag: 'West Kanpur' },
      { name: 'Swaroop Nagar', pincode: '208002', tag: 'Central' },
      { name: 'Civil Lines', pincode: '208001', tag: 'City Center' },
      { name: 'Kakadeo', pincode: '208025', tag: 'Student Hub' },
      { name: 'Kidwai Nagar', pincode: '208011', tag: 'South Kanpur' },
      { name: 'Barra', pincode: '208027', tag: 'South Kanpur' },
      { name: 'Govind Nagar', pincode: '208006', tag: 'South Kanpur' },
      { name: 'IIT Kanpur', pincode: '208016', tag: 'Academic / Tech' },
      { name: 'Chakeri (Airport)', pincode: '208008', tag: 'East Kanpur' },
      { name: 'Rawatpur', pincode: '208019', tag: 'Central' },
      { name: 'Armapur Estate', pincode: '208009', tag: 'Defense' },
      { name: 'Panki', pincode: '208020', tag: 'Industrial' },
      { name: 'Kanpur Cantt', pincode: '208004', tag: 'Cantonment' },
      { name: 'Shyam Nagar', pincode: '208013', tag: 'East Kanpur' },
      { name: 'Lajpat Nagar', pincode: '208005', tag: 'Central Market' },
      { name: 'Gumti No. 5', pincode: '208012', tag: 'Commercial' }
    ]
  },
  lucknow: {
    state: 'Uttar Pradesh',
    localities: [
      { name: 'Hazratganj', pincode: '226001', tag: 'Heart of City' },
      { name: 'Gomti Nagar', pincode: '226010', tag: 'Vibrant Hub' },
      { name: 'Alambagh', pincode: '226005', tag: 'South Lucknow' },
      { name: 'Indira Nagar', pincode: '226016', tag: 'Residential' },
      { name: 'Charbagh', pincode: '226004', tag: 'Transit Center' },
      { name: 'Mahanagar', pincode: '226006', tag: 'North Lucknow' },
      { name: 'Aliganj', pincode: '226024', tag: 'North Central' },
      { name: 'Chowk', pincode: '226003', tag: 'Old City' },
      { name: 'Jankipuram', pincode: '226021', tag: 'North Lucknow' },
      { name: 'Ashiyana', pincode: '226012', tag: 'South' }
    ]
  },
  noida: {
    state: 'Uttar Pradesh',
    localities: [
      { name: 'Sector 18', pincode: '201301', tag: 'Commercial Hub' },
      { name: 'Sector 62', pincode: '201309', tag: 'Electronic City Tech' },
      { name: 'Sector 137', pincode: '201305', tag: 'Expressway' },
      { name: 'Sector 50', pincode: '201307', tag: 'Residential' },
      { name: 'Greater Noida West', pincode: '201306', tag: 'Extension' }
    ]
  },
  hyderabad: {
    state: 'Telangana',
    localities: [
      { name: 'Hitec City', pincode: '500081', tag: 'Cyberabad IT' },
      { name: 'Banjara Hills', pincode: '500034', tag: 'Central' },
      { name: 'Jubilee Hills', pincode: '500033', tag: 'West' },
      { name: 'Gachibowli', pincode: '500032', tag: 'IT Corridor' },
      { name: 'Secunderabad', pincode: '500003', tag: 'Twin City' },
      { name: 'Charminar', pincode: '500002', tag: 'Old City' }
    ]
  },
  jaipur: {
    state: 'Rajasthan',
    localities: [
      { name: 'C-Scheme', pincode: '302001', tag: 'Heart of City' },
      { name: 'Malviya Nagar', pincode: '302017', tag: 'South Jaipur' },
      { name: 'Mansarovar', pincode: '302020', tag: 'Residential' },
      { name: 'Vaishali Nagar', pincode: '302021', tag: 'West' },
      { name: 'Pink City', pincode: '302002', tag: 'Heritage Walled City' },
      { name: 'Raja Park', pincode: '302004', tag: 'Commercial' }
    ]
  },
  kolkata: {
    state: 'West Bengal',
    localities: [
      { name: 'Park Street', pincode: '700016', tag: 'Central Hub' },
      { name: 'Salt Lake (Sector V)', pincode: '700091', tag: 'IT Hub' },
      { name: 'New Town', pincode: '700156', tag: 'Rajarhat Hub' },
      { name: 'Howrah', pincode: '711101', tag: 'Transit & River' },
      { name: 'Ballygunge', pincode: '700019', tag: 'South Kolkata' }
    ]
  },
  ahmedabad: {
    state: 'Gujarat',
    localities: [
      { name: 'Navrangpura', pincode: '380009', tag: 'University Hub' },
      { name: 'SG Highway', pincode: '380054', tag: 'Commercial Axis' },
      { name: 'Bodakdev', pincode: '380054', tag: 'West' },
      { name: 'Satellite', pincode: '380015', tag: 'Residential' }
    ]
  },
  varanasi: {
    state: 'Uttar Pradesh',
    localities: [
      { name: 'Assi Ghat', pincode: '221005', tag: 'Heritage South' },
      { name: 'Dashashwamedh', pincode: '221001', tag: 'Main Ghat' },
      { name: 'Lanka (BHU Campus)', pincode: '221005', tag: 'University Hub' },
      { name: 'Varanasi Cantt', pincode: '221002', tag: 'Station Area' },
      { name: 'Godowlia', pincode: '221001', tag: 'Central Market' }
    ]
  },
  prayagraj: {
    state: 'Uttar Pradesh',
    localities: [
      { name: 'Civil Lines', pincode: '211001', tag: 'City Center' },
      { name: 'Katra', pincode: '211002', tag: 'University Hub' },
      { name: 'George Town', pincode: '211002', tag: 'Central' },
      { name: 'Naini', pincode: '211008', tag: 'Industrial' }
    ]
  },
  agra: {
    state: 'Uttar Pradesh',
    localities: [
      { name: 'Taj Ganj', pincode: '282001', tag: 'Heritage Zone' },
      { name: 'Sanjay Place', pincode: '282002', tag: 'Commercial Center' },
      { name: 'Dayalbagh', pincode: '282005', tag: 'North Agra' },
      { name: 'Kamla Nagar', pincode: '282005', tag: 'Residential' }
    ]
  },
  patna: {
    state: 'Bihar',
    localities: [
      { name: 'Boring Road', pincode: '800001', tag: 'Commercial & Student Hub' },
      { name: 'Kankarbagh', pincode: '800020', tag: 'South' },
      { name: 'Bailey Road', pincode: '800014', tag: 'West' }
    ]
  },
  bhopal: {
    state: 'Madhya Pradesh',
    localities: [
      { name: 'MP Nagar', pincode: '462011', tag: 'Business District' },
      { name: 'Arera Colony', pincode: '462016', tag: 'South' },
      { name: 'New Market', pincode: '462003', tag: 'Central Market' }
    ]
  },
  indore: {
    state: 'Madhya Pradesh',
    localities: [
      { name: 'Vijay Nagar', pincode: '452010', tag: 'Modern North' },
      { name: 'Palasia', pincode: '452001', tag: 'Central' },
      { name: 'Rajwada', pincode: '452002', tag: 'Historic Heart' }
    ]
  },
  chandigarh: {
    state: 'Chandigarh',
    localities: [
      { name: 'Sector 17', pincode: '160017', tag: 'City Center Plaza' },
      { name: 'Sector 35', pincode: '160022', tag: 'Market Hub' },
      { name: 'Mohali Phase 7', pincode: '160062', tag: 'Tech Park' }
    ]
  },
  dehradun: {
    state: 'Uttarakhand',
    localities: [
      { name: 'Rajpur Road', pincode: '248001', tag: 'North Corridor' },
      { name: 'Clock Tower', pincode: '248001', tag: 'City Center' },
      { name: 'Jakhan', pincode: '248009', tag: 'North Dehradun' }
    ]
  }
};
