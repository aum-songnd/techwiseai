const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = '/tmp/cps_cache';
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const HTML_ENTITIES = {
    "&aacute;": "á", "&aacute": "á", "&Aacute;": "Á",
    "&agrave;": "à", "&agrave": "à", "&Agrave;": "À",
    "&atilde;": "ã", "&atilde": "ã", "&Atilde;": "Ã",
    "&acirc;": "â", "&acirc": "â", "&Acirc;": "Â",
    "&eacute;": "é", "&eacute": "é", "&Eacute;": "É",
    "&egrave;": "è", "&egrave": "è", "&Egrave;": "È",
    "&ecirc;": "ê", "&ecirc": "ê", "&Ecirc;": "Ê",
    "&iacute;": "í", "&iacute": "í", "&Iacute;": "Í",
    "&igrave;": "ì", "&igrave": "ì", "&Igrave;": "Ì",
    "&oacute;": "ó", "&oacute": "ó", "&Oacute;": "Ó",
    "&ograve;": "ò", "&ograve": "ò", "&Ograve;": "Ò",
    "&otilde;": "õ", "&otilde": "õ", "&Otilde;": "Õ",
    "&ocirc;": "ô", "&ocirc": "ô", "&Ocirc;": "Ô",
    "&uacute;": "ú", "&uacute": "ú", "&Uacute;": "Ú",
    "&ugrave;": "ù", "&ugrave": "ù", "&Ugrave;": "Ù",
    "&yacute;": "ý", "&yacute": "ý", "&Yacute;": "Ý",
    "&nbsp;": " ", "&amp;": "&", "&quot;": "\"", "&lt;": "<", "&gt;": ">",
    "&#39;": "'", "&apos;": "'", "&ndash;": "-", "&mdash;": "—",
    "&bull;": "•", "&hellip;": "...", "&deg;": "°", "&times;": "×",
    "&plusmn;": "±", "&trade;": "™", "&reg;": "®", "&copy;": "©"
};

function decodeEntities(str) {
    if (!str) return '';
    let s = str.replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec))
               .replace(/&#x([0-9a-fA-F]+);/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
    for (const [ent, val] of Object.entries(HTML_ENTITIES)) {
        s = s.replaceAll(ent, val);
    }
    return s;
}

function cleanHtmlText(str) {
    if (!str) return '';
    const decoded = decodeEntities(str);
    return decoded
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/[ \u00a0]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
}

function filterOutPromo(text) {
    if (!text) return '';
    const lines = text.split('\n');
    const cleanLines = lines.filter(line => {
        const l = line.toLowerCase();
        if (l.includes('flash sale') || l.includes('giá rẻ') || l.includes('mua ngay') ||
            l.includes('trợ giá') || l.includes('s-student') || l.includes('s-teacher') ||
            l.includes('trả góp') || l.includes('bảo hành vip') || l.includes('giao hàng') ||
            l.includes('smember') || l.includes('ưu đãi') || l.includes('khuyến mãi') ||
            l.includes('cellphones') || l.includes('giữ đơn hàng') || l.includes('tại đây')) {
            return false;
        }
        return true;
    });
    return cleanLines.join('\n').trim();
}

function formatPriceVND(price) {
    if (price === null || price === undefined || isNaN(price)) return 'Liên hệ';
    return Number(price).toLocaleString('vi-VN') + ' ₫';
}

function buildRagDocument(prod) {
    const lines = [];
    lines.push(`# ${prod.name}`);
    lines.push(`- **Mã sản phẩm (SKU)**: ${prod.sku || 'N/A'}`);
    lines.push(`- **Danh mục**: ${prod.category || prod.categorySlug || 'Khác'}`);
    lines.push(`- **Thương hiệu**: ${prod.brand || 'Khác'}`);
    lines.push(`- **Giá bán**: ${formatPriceVND(prod.price)}`);
    if (prod.originalPrice) {
        lines.push(`- **Giá niêm yết ban đầu**: ${formatPriceVND(prod.originalPrice)}`);
    }
    if (prod.warranty) {
        lines.push(`- **Bảo hành**: ${prod.warranty}`);
    }

    if (prod.highlights && prod.highlights.length > 0) {
        lines.push(`\n## Đặc điểm nổi bật`);
        for (const h of prod.highlights) {
            lines.push(`- ${h}`);
        }
    }

    if (prod.specifications && Object.keys(prod.specifications).length > 0) {
        lines.push(`\n## Thông số kỹ thuật`);
        for (const [group, specs] of Object.entries(prod.specifications)) {
            if (typeof specs === 'object' && specs !== null && !Array.isArray(specs)) {
                lines.push(`\n### ${group}`);
                for (const [key, val] of Object.entries(specs)) {
                    const cleanVal = String(val).replace(/\n/g, ', ');
                    lines.push(`- **${key}**: ${cleanVal}`);
                }
            } else {
                lines.push(`- **${group}**: ${String(specs).replace(/\n/g, ', ')}`);
            }
        }
    }

    return lines.join('\n');
}

async function searchProductUrl(name) {
    const cleanTerm = name.replace(/[|\/]/g, ' ').replace(/\s+/g, ' ').trim();
    const query = `
    query quick_search {
        quick_search(user_query: { terms: "${cleanTerm.replace(/"/g, '\\"')}", province: 30 }) {
            products {
                product_id
                name
                sku
                url_path
            }
        }
    }
    `;

    try {
        const res = await fetch("https://api.cellphones.com.vn/graphql-search/v2/graphql/query", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Client-Type": "web"
            },
            body: JSON.stringify({ query }),
            signal: AbortSignal.timeout(6000)
        });
        if (res.status === 200) {
            const data = await res.json();
            const prods = data.data?.quick_search?.products;
            if (prods && prods.length > 0) {
                const isLookingForCu = cleanTerm.toLowerCase().includes('cũ') || cleanTerm.toLowerCase().includes('đã kích hoạt');
                let best = prods[0];
                for (const p of prods) {
                    const pName = p.name.toLowerCase();
                    if (!isLookingForCu && (pName.includes('cũ') || pName.includes('đã kích hoạt') || pName.includes('trưng bày'))) {
                        continue;
                    }
                    best = p;
                    break;
                }
                return best.url_path;
            }
        }
    } catch (e) {}
    return null;
}

async function fetchHtmlWithCache(url) {
    // USE TRUE MD5 HASH OF URL FOR CACHE KEY
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const cacheFile = path.join(CACHE_DIR, `${hash}.html`);
    if (fs.existsSync(cacheFile)) {
        return fs.readFileSync(cacheFile, 'utf8');
    }

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(10000)
    });
    if (res.status !== 200) return null;
    const html = await res.text();
    fs.writeFileSync(cacheFile, html, 'utf8');
    return html;
}

function parseNuxtData(html) {
    try {
        const match = html.match(/window\.__NUXT__\s*=\s*([\s\S]+?);\s*<\/script>/);
        if (!match) return null;
        const nuxt = eval(match[1]);
        const pd = nuxt.state?.product?.productData;
        if (!pd) return null;

        const general = pd.general || {};
        const attributes = general.attributes || {};
        const specObj = pd.specification || {};

        const groupedSpecs = {};
        const flatSpecs = {};
        if (specObj.full_by_group && Array.isArray(specObj.full_by_group)) {
            for (const grp of specObj.full_by_group) {
                const grpTitle = cleanHtmlText(grp.label || 'Thông số khác');
                if (!groupedSpecs[grpTitle]) groupedSpecs[grpTitle] = {};
                if (Array.isArray(grp.value)) {
                    for (const item of grp.value) {
                        const lbl = cleanHtmlText(item.label || item.key);
                        const val = cleanHtmlText(item.value || '');
                        if (lbl && val) {
                            groupedSpecs[grpTitle][lbl] = val;
                            flatSpecs[lbl] = val;
                        }
                    }
                }
            }
        } else if (specObj.basic && Array.isArray(specObj.basic)) {
            groupedSpecs['Thông số cơ bản'] = {};
            for (const item of specObj.basic) {
                const lbl = cleanHtmlText(item.label || item.key);
                const val = cleanHtmlText(item.value || '');
                if (lbl && val) {
                    groupedSpecs['Thông số cơ bản'][lbl] = val;
                    flatSpecs[lbl] = val;
                }
            }
        }

        const warranty = cleanHtmlText(attributes.warranty_information || '');

        let highlights = [];
        if (attributes.key_selling_points) {
            const rawKsp = cleanHtmlText(attributes.key_selling_points);
            const cleanKsp = filterOutPromo(rawKsp);
            if (cleanKsp) {
                highlights = cleanKsp.split('\n').map(s => s.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
            }
        }

        let images = [];
        if (general.galleries && Array.isArray(general.galleries)) {
            images = general.galleries.map((g, idx) => ({
                imageUrl: g.image?.startsWith('http') ? g.image : `https://cdn2.cellphones.com.vn/x/media/catalog/product${g.image}`,
                altText: g.label || general.name || '',
                displayOrder: idx,
                primaryImage: idx === 0
            }));
        }

        return {
            name: general.name,
            brand: general.manufacturer,
            warranty,
            highlights,
            groupedSpecs,
            flatSpecs,
            images
        };
    } catch (e) {
        return null;
    }
}

async function resolveProductUrl(p) {
    // 1. If existing sourceUrl works
    if (p.sourceUrl) {
        try {
            const html = await fetchHtmlWithCache(p.sourceUrl);
            if (html && html.includes('cps-block-technicalInfo')) {
                return { url: p.sourceUrl, html };
            }
        } catch (e) {}
    }

    // 2. Candidate URLs
    const candidates = [
        `https://cellphones.com.vn/${p.slug}.html`,
        `https://cellphones.com.vn/${p.categorySlug}-${p.slug}.html`,
    ];

    const cleanSlug = p.slug.replace(/-(?:128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|32gb|64gb|4g|5g|vna|chinh-hang|anc)/g, '');
    candidates.push(`https://cellphones.com.vn/${cleanSlug}.html`);
    candidates.push(`https://cellphones.com.vn/${p.categorySlug}-${cleanSlug}.html`);

    for (const c of Array.from(new Set(candidates))) {
        try {
            const html = await fetchHtmlWithCache(c);
            if (html && html.includes('cps-block-technicalInfo')) {
                return { url: c, html };
            }
        } catch (e) {}
    }

    // 3. Search via GraphQL
    const searchPath = await searchProductUrl(p.name);
    if (searchPath) {
        const searchUrl = `https://cellphones.com.vn/${searchPath}`;
        try {
            const html = await fetchHtmlWithCache(searchUrl);
            if (html && html.includes('cps-block-technicalInfo')) {
                return { url: searchUrl, html };
            }
        } catch (e) {}
    }

    return null;
}

// Concurrency helper
async function mapConcurrent(items, limit, fn) {
    const results = new Array(items.length);
    let index = 0;
    const workers = new Array(limit).fill(0).map(async () => {
        while (index < items.length) {
            const cur = index++;
            results[cur] = await fn(items[cur], cur);
        }
    });
    await Promise.all(workers);
    return results;
}

async function processFile(filePath) {
    console.log(`\n========================================`);
    console.log(`Processing file: ${filePath}`);
    console.log(`========================================`);

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    const backupPath = filePath + '.bak';
    if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, raw, 'utf8');
        console.log(`Created backup at: ${backupPath}`);
    }

    const products = data.products || [];
    console.log(`Total products to process: ${products.length}`);

    let crawledSuccess = 0;
    let fallbackCount = 0;

    const processedProducts = await mapConcurrent(products, 5, async (p, idx) => {
        const resolved = await resolveProductUrl(p);
        let parsed = null;
        let finalUrl = p.sourceUrl || `https://cellphones.com.vn/${p.slug}.html`;

        if (resolved) {
            finalUrl = resolved.url;
            parsed = parseNuxtData(resolved.html);
        }

        // Clean existing specs as fallback if crawl failed or missing specs
        const fallbackFlat = {};
        if (p.specifications) {
            for (const [k, v] of Object.entries(p.specifications)) {
                fallbackFlat[k] = cleanHtmlText(String(v));
            }
        }

        let fallbackHighlights = [];
        if (p.shortDescription) {
            const cleanDesc = filterOutPromo(cleanHtmlText(p.shortDescription));
            if (cleanDesc) fallbackHighlights.push(cleanDesc);
        }

        let brand = p.brand;
        let warranty = p.warranty;
        let groupedSpecs = {};
        let flatSpecs = {};
        let highlights = [];
        let images = p.images || [];

        if (parsed && Object.keys(parsed.flatSpecs).length > 0) {
            crawledSuccess++;
            brand = parsed.brand || brand;
            warranty = parsed.warranty || warranty;
            groupedSpecs = parsed.groupedSpecs;
            flatSpecs = parsed.flatSpecs;
            highlights = parsed.highlights.length > 0 ? parsed.highlights : fallbackHighlights;
            if (parsed.images.length > 0) images = parsed.images;
        } else {
            fallbackCount++;
            groupedSpecs = { 'Thông số kỹ thuật': fallbackFlat };
            flatSpecs = fallbackFlat;
            highlights = fallbackHighlights;
        }

        // Build product object structured cleanly for RAG
        const resultProd = {
            id: p.sku || `PROD-${String(idx + 1).padStart(4, '0')}`,
            sku: p.sku || `PROD-${String(idx + 1).padStart(4, '0')}`,
            name: p.name,
            slug: p.slug,
            category: data.metadata?.category?.name || p.categorySlug || '',
            categorySlug: p.categorySlug,
            brand: brand || '',
            // PRESERVE PRICES EXACTLY AS IN THE FILE
            price: p.price,
            originalPrice: p.originalPrice,
            warranty: warranty || null,
            stockQuantity: p.stockQuantity ?? 10,
            soldCount: p.soldCount ?? 0,
            ratingAverage: p.ratingAverage ?? 5.0,
            thumbnailUrl: p.thumbnailUrl || (images[0]?.imageUrl || ''),
            sourceUrl: finalUrl,
            crawledAt: new Date().toISOString(),
            highlights: highlights,
            specifications: groupedSpecs,
            flatSpecifications: flatSpecs,
            images: images
        };

        // Generate RAG Markdown Document
        resultProd.rag_document = buildRagDocument(resultProd);

        if ((idx + 1) % 20 === 0 || idx + 1 === products.length) {
            console.log(`Progress: ${idx + 1}/${products.length} (Live: ${crawledSuccess}, Fallback: ${fallbackCount})`);
        }

        return resultProd;
    });

    const outputData = {
        metadata: {
            source: 'cellphones.com.vn',
            category: data.metadata?.category || { name: '', slug: '' },
            totalProducts: processedProducts.length,
            crawledLiveCount: crawledSuccess,
            fallbackCount: fallbackCount,
            generatedAt: new Date().toISOString(),
            schema: 'rag_optimized_v1',
            notes: [
                'Giữ nguyên giá sản phẩm theo file gốc.',
                'Đầy đủ thông số kỹ thuật (groupedSpecifications & flatSpecifications).',
                'Đã loại bỏ toàn bộ thông tin bán hàng, khuyến mãi, quảng cáo, SEO.',
                'Bổ sung trường rag_document định dạng Markdown sẵn sàng cho chunking & embedding.'
            ]
        },
        products: processedProducts
    };

    fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`Saved updated file to: ${filePath}`);
    console.log(`Results: ${crawledSuccess} crawled live with full specs, ${fallbackCount} used cleaned fallback.`);
}

async function run() {
    // Restore backups first to make sure we crawl from authentic initial data
    const files = [
        'tai-nghe_cleaned_for_import.json',
        'dien-thoai_cleaned_for_import.json',
        'linh-kien_cleaned_for_import.json',
        'may-anh_cleaned_for_import.json',
        'phu-kien_cleaned_for_import.json',
        'laptops_cleaned_for_import.json'
    ];

    for (const f of files) {
        const fullPath = path.resolve('/home/toioang/rag_service/data', f);
        const bakPath = fullPath + '.bak';
        if (fs.existsSync(bakPath)) {
            fs.copyFileSync(bakPath, fullPath);
        }
    }

    for (const f of files) {
        const fullPath = path.resolve('/home/toioang/rag_service/data', f);
        await processFile(fullPath);
    }

    console.log('\nAll 6 files successfully crawled, cleaned, and formatted for RAG!');
}

run();
