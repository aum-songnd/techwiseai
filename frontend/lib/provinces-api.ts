import provincesV1Raw from "@/data/provinces-v1.json";
import districtsV1Raw from "@/data/districts-v1.json";
import provincesV2Raw from "@/data/provinces-v2.json";

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

// In-memory indexed maps for O(1) fast lookup
let districtMapV1: Map<number, District[]> | null = null;
let wardMapV1: Map<number, Ward[]> | null = null;
let wardMapV2: Map<number, Ward[]> | null = null;

function getDistrictMapV1(): Map<number, District[]> {
  if (!districtMapV1) {
    districtMapV1 = new Map();
    for (const d of districtsV1Raw as District[]) {
      const pCode = Number(d.province_code);
      const list = districtMapV1.get(pCode) || [];
      list.push(d);
      districtMapV1.set(pCode, list);
    }
  }
  return districtMapV1;
}

async function getWardMapV1(): Promise<Map<number, Ward[]>> {
  if (!wardMapV1) {
    const raw = (await import("@/data/wards-v1.json")).default as Ward[];
    wardMapV1 = new Map();
    for (const w of raw) {
      const dCode = Number(w.district_code);
      const list = wardMapV1.get(dCode) || [];
      list.push(w);
      wardMapV1.set(dCode, list);
    }
  }
  return wardMapV1;
}

async function getWardMapV2(): Promise<Map<number, Ward[]>> {
  if (!wardMapV2) {
    const raw = (await import("@/data/wards-v2.json")).default as Ward[];
    wardMapV2 = new Map();
    for (const w of raw) {
      const pCode = Number(w.province_code);
      const list = wardMapV2.get(pCode) || [];
      list.push(w);
      wardMapV2.set(pCode, list);
    }
  }
  return wardMapV2;
}

// ==========================================
// V2: Dữ liệu hành chính SAU SÁP NHẬP (Mới nhất)
// 34 Tỉnh/Thành phố và Phường/Xã trực thuộc
// ==========================================

export async function fetchProvincesV2(): Promise<Province[]> {
  return provincesV2Raw as Province[];
}

export async function fetchWardsV2(
  provinceCode: number | string
): Promise<Ward[]> {
  const map = await getWardMapV2();
  return map.get(Number(provinceCode)) || [];
}

export async function lookupLegacyWard(
  legacyName: string
): Promise<Ward | null> {
  if (!legacyName) return null;
  const normalized = legacyName.trim().toLowerCase();
  const raw = (await import("@/data/wards-v2.json")).default as Ward[];
  const found = raw.find((w) => w.name.toLowerCase().includes(normalized));
  return found || null;
}

// ==========================================
// V1: Dữ liệu TRƯỚC SÁP NHẬP (63 Tỉnh/Thành)
// 3 cấp: Tỉnh -> Quận/Huyện -> Phường/Xã
// ==========================================

export async function fetchProvincesV1(): Promise<Province[]> {
  return provincesV1Raw as Province[];
}

export async function fetchDistrictsV1(
  provinceCode: number | string
): Promise<District[]> {
  const map = getDistrictMapV1();
  return map.get(Number(provinceCode)) || [];
}

export async function fetchWardsV1(
  districtCode: number | string
): Promise<Ward[]> {
  const map = await getWardMapV1();
  return map.get(Number(districtCode)) || [];
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
