export interface Province {
  code: number;
  name: string;
}

export interface District {
  code: number;
  name: string;
  province_code: number;
}

export interface Ward {
  code: number;
  name: string;
  district_code?: number;
  province_code?: number;
}

const CACHE = {
  v1Provinces: null as Province[] | null,
  v1Districts: new Map<number, District[]>(),
  v1Wards: new Map<number, Ward[]>(),

  v2Provinces: null as Province[] | null,
  v2Wards: new Map<number, Ward[]>(),
};

const BASE_URL_V1 = "https://provinces.open-api.vn/api/v1";
const BASE_URL_V2 = "https://provinces.open-api.vn/api/v2";

// ==========================================
// V2: Dữ liệu hành chính SAU SÁP NHẬP (Mới nhất)
// 34 Tỉnh/Thành phố và Phường/Xã trực thuộc
// ==========================================

export async function fetchProvincesV2(): Promise<Province[]> {
  if (CACHE.v2Provinces && CACHE.v2Provinces.length > 0) {
    return CACHE.v2Provinces;
  }
  try {
    const res = await fetch(`${BASE_URL_V2}/p/`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Failed to fetch v2 provinces");
    const data = (await res.json()) as Province[];
    CACHE.v2Provinces = data;
    return data;
  } catch (error) {
    console.error("fetchProvincesV2 error:", error);
    return [];
  }
}

export async function fetchWardsV2(provinceCode: number): Promise<Ward[]> {
  if (CACHE.v2Wards.has(provinceCode)) {
    return CACHE.v2Wards.get(provinceCode)!;
  }
  try {
    const res = await fetch(`${BASE_URL_V2}/p/${provinceCode}?depth=2`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Failed to fetch v2 wards");
    const data = await res.json();
    const wards = (data.wards ?? []) as Ward[];
    CACHE.v2Wards.set(provinceCode, wards);
    return wards;
  } catch (error) {
    console.error("fetchWardsV2 error:", error);
    return [];
  }
}

export async function lookupLegacyWard(legacyName: string): Promise<Ward | null> {
  try {
    const res = await fetch(
      `${BASE_URL_V2}/w/from-legacy/?legacy_name=${encodeURIComponent(
        legacyName.trim()
      )}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].ward) {
      return data[0].ward as Ward;
    }
    return null;
  } catch {
    return null;
  }
}

// ==========================================
// V1: Dữ liệu TRƯỚC SÁP NHẬP (63 Tỉnh/Thành)
// 3 cấp: Tỉnh -> Quận/Huyện -> Phường/Xã
// ==========================================

export async function fetchProvincesV1(): Promise<Province[]> {
  if (CACHE.v1Provinces && CACHE.v1Provinces.length > 0) {
    return CACHE.v1Provinces;
  }
  try {
    const res = await fetch(`${BASE_URL_V1}/p/`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Failed to fetch v1 provinces");
    const data = (await res.json()) as Province[];
    CACHE.v1Provinces = data;
    return data;
  } catch (error) {
    console.error("fetchProvincesV1 error:", error);
    return [];
  }
}

export async function fetchDistrictsV1(provinceCode: number): Promise<District[]> {
  if (CACHE.v1Districts.has(provinceCode)) {
    return CACHE.v1Districts.get(provinceCode)!;
  }
  try {
    const res = await fetch(`${BASE_URL_V1}/p/${provinceCode}?depth=2`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Failed to fetch v1 districts");
    const data = await res.json();
    const districts = (data.districts ?? []) as District[];
    CACHE.v1Districts.set(provinceCode, districts);
    return districts;
  } catch (error) {
    console.error("fetchDistrictsV1 error:", error);
    return [];
  }
}

export async function fetchWardsV1(districtCode: number): Promise<Ward[]> {
  if (CACHE.v1Wards.has(districtCode)) {
    return CACHE.v1Wards.get(districtCode)!;
  }
  try {
    const res = await fetch(`${BASE_URL_V1}/d/${districtCode}?depth=2`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error("Failed to fetch v1 wards");
    const data = await res.json();
    const wards = (data.wards ?? []) as Ward[];
    CACHE.v1Wards.set(districtCode, wards);
    return wards;
  } catch (error) {
    console.error("fetchWardsV1 error:", error);
    return [];
  }
}

// Aliases for backwards compatibility
export const fetchProvinces = fetchProvincesV2;
export const fetchDistricts = fetchDistrictsV1;
export const fetchWards = fetchWardsV1;

// ==========================================
// Reverse Geocoding
// ==========================================

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ provinceName?: string; districtName?: string; locality?: string }> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`
    );
    if (!res.ok) return {};
    const data = await res.json();
    return {
      provinceName: data.principalSubdivision || data.city,
      districtName: data.locality,
      locality: data.localityInfo?.administrative?.[3]?.name,
    };
  } catch {
    return {};
  }
}
