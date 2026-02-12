/**
 * JIS X 0410 地域メッシュコード変換ユーティリティ
 */

// 1次メッシュコードから緯度経度（南西端）への変換
// format: [latitude, longitude]
function mesh1ToLatLon(code) {
    const lat = parseInt(code.substring(0, 2)) / 1.5;
    const lon = parseInt(code.substring(2, 4)) + 100;
    return [lat, lon];
}

/**
 * 10桁メッシュコード（5次メッシュ/250mメッシュ）から矩形（Bounds）を取得する
 * @param {string|number} code - 10桁のメッシュコード
 * @returns {L.LatLngBounds} - LeafletのLatLngBoundsオブジェクト
 */
function meshToRect(code) {
    const codeStr = String(code);
    if (codeStr.length !== 10) {
        throw new Error("Invalid mesh code length: " + codeStr.length);
    }

    // 1次メッシュ (4桁)
    const code1 = codeStr.substring(0, 4);
    const lat1 = parseInt(codeStr.substring(0, 2)) / 1.5;
    const lon1 = parseInt(codeStr.substring(2, 4)) + 100;

    // 2次メッシュ (2桁)
    // 緯度方向: 5分 (5/60 = 1/12度)
    // 経度方向: 7分30秒 (7.5/60 = 1/8度)
    const code2_lat = parseInt(codeStr.charAt(4));
    const code2_lon = parseInt(codeStr.charAt(5));
    const lat2 = lat1 + code2_lat * (1 / 12); // 5分
    const lon2 = lon1 + code2_lon * (1 / 8);  // 7分30秒

    // 3次メッシュ (2桁)
    // 緯度方向: 30秒 (30/3600 = 1/120度)
    // 経度方向: 45秒 (45/3600 = 1/80度)
    const code3_lat = parseInt(codeStr.charAt(6));
    const code3_lon = parseInt(codeStr.charAt(7));
    const lat3 = lat2 + code3_lat * (30 / 3600);
    const lon3 = lon2 + code3_lon * (45 / 3600);

    // 4次メッシュ (2桁) - 2等分
    // 緯度方向: 15秒 (15/3600度)
    // 経度方向: 22.5秒 (22.5/3600度)
    // 5次メッシュの場合は4次メッシュの区分け（1〜4）を使う
    // コード形式: 1次(4)+2次(2)+3次(2)+4次(1)+5次(1) ではなく、
    // 10桁コードは通常: 1次(4)+2次(2)+3次(2)+分割(2) ?
    // JIS X 0410 の標準的な10桁（5倍メッシュや2倍メッシュなど）の定義を確認する必要があるが、
    // ここでは一般的な拡張定義である 1/2地域メッシュ(4次) -> 1/4地域メッシュ(5次) として扱う。

    // 一般的な10桁メッシュ（4次+5次）の解釈:
    // 8桁目までで3次メッシュ。
    // 9桁目: 4次メッシュ区画 (1, 2, 3, 4)
    // 10桁目: 5次メッシュ区画 (1, 2, 3, 4)

    // 3次メッシュの幅・高さ
    const lat3_h = 30 / 3600;
    const lon3_w = 45 / 3600;

    // 4次メッシュ区画
    const code4 = parseInt(codeStr.charAt(8));
    const lat4 = lat3 + (code4 > 2 ? lat3_h / 2 : 0);
    const lon4 = lon3 + ((code4 % 2) === 0 ? lon3_w / 2 : 0);

    // 4次メッシュの幅・高さ
    const lat4_h = lat3_h / 2;
    const lon4_w = lon3_w / 2;

    // 5次メッシュ区画
    const code5 = parseInt(codeStr.charAt(9));
    const lat5 = lat4 + (code5 > 2 ? lat4_h / 2 : 0);
    const lon5 = lon4 + ((code5 % 2) === 0 ? lon4_w / 2 : 0);

    const lat5_h = lat4_h / 2;
    const lon5_w = lon4_w / 2;

    // 南西端: (lat5, lon5)
    // 北東端: (lat5 + lat5_h, lon5 + lon5_w)

    return L.latLngBounds(
        [lat5, lon5],
        [lat5 + lat5_h, lon5 + lon5_w]
    );
}
