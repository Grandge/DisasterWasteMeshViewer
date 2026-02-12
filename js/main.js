// グローバル変数
let map;
let geojsonLayer;

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
});

function initMap() {
    // 地図の初期化（日本全体を表示）
    map = L.map('map').setView([36.2048, 138.2529], 5);

    // 国土地理院淡色地図
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>",
        maxZoom: 18
    }).addTo(map);
}

function setupEventListeners() {
    const fileInput = document.getElementById('csv-file');
    fileInput.addEventListener('change', handleFileSelect);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const statusMsg = document.getElementById('status-message');
    statusMsg.textContent = '読み込み中...';

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (results) {
            console.log('Parsed results:', results);
            if (results.errors.length > 0) {
                console.error('Errors:', results.errors);
                statusMsg.textContent = 'エラーが発生しました: ' + results.errors[0].message;
            } else {
                statusMsg.textContent = `読み込み完了: ${results.data.length} 件のデータ`;
                processData(results.data);
            }
        },
        error: function (error) {
            console.error('Error:', error);
            statusMsg.textContent = '読み込みエラー: ' + error.message;
        }
    });
}

function processData(data) {
    console.log("Processing data...", data.length);

    // 既存のレイヤーがあれば削除
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    // 値の最大値を計算（色分け用）
    let maxValue = 0;
    data.forEach(row => {
        if (row.Value > maxValue) maxValue = row.Value;
    });
    console.log("Max Value:", maxValue);

    const features = [];
    let errorCount = 0;

    data.forEach(row => {
        if (!row.CODE) return;

        try {
            // メッシュコードから矩形を取得
            // meshToRectは LatLngBounds を返す: { _southWest: {lat, lng}, _northEast: {lat, lng} }
            const bounds = meshToRect(String(row.CODE));
            const southWest = bounds.getSouthWest();
            const northEast = bounds.getNorthEast();

            // GeoJSON Polygon
            // 座標順序: [経度, 緯度] (GeoJSON規格)
            // 閉じたリングにするため、最初の点を最後に追加
            const polygon = {
                type: "Feature",
                properties: {
                    code: row.CODE,
                    value: row.Value
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [southWest.lng, southWest.lat],
                        [southWest.lng, northEast.lat],
                        [northEast.lng, northEast.lat],
                        [northEast.lng, southWest.lat],
                        [southWest.lng, southWest.lat]
                    ]]
                }
            };
            features.push(polygon);

        } catch (e) {
            errorCount++;
            if (errorCount <= 5) console.error("Mesh convert error:", row.CODE, e);
        }
    });

    console.log(`Generated ${features.length} features. Errors: ${errorCount}`);

    const geoJsonData = {
        type: "FeatureCollection",
        features: features
    };

    // GeoJSONレイヤー作成
    geojsonLayer = L.geoJSON(geoJsonData, {
        style: function (feature) {
            return {
                fillColor: getColor(feature.properties.value, maxValue),
                weight: 1,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.6
            };
        },
        onEachFeature: function (feature, layer) {
            const props = feature.properties;
            layer.bindPopup(`
                <strong>メッシュコード:</strong> ${props.code}<br>
                <strong>廃棄物量:</strong> ${props.value} t
            `);

            // ホバー効果
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight
            });
        }
    }).addTo(map);

    // データ範囲にズーム
    if (features.length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }

    addLegend();
}

// 凡例を追加
function addLegend() {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [0, 10, 20, 50, 100, 200, 500, 1000];
        const labels = [];

        div.innerHTML = '<h4>廃棄物量 (t)</h4>';

        // 0の扱い
        div.innerHTML +=
            '<i style="background:' + getColor(0) + '"></i> 0<br>';

        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
        }

        return div;
    };

    // 既存の凡例があれば削除（簡易実装: クラスで探して削除）
    const existingLegends = document.getElementsByClassName('info legend');
    while (existingLegends.length > 0) {
        existingLegends[0].parentNode.removeChild(existingLegends[0]);
    }

    legend.addTo(map);
}

// 値に応じた色を返す (青 -> 黄 -> 赤)
function getColor(value, max) {
    if (value === 0) return '#cccccc'; // 0はグレー

    // 単純な線形補間ではなく、ランク分けなどを検討すべきだが、まずは比率で
    const ratio = value / (max || 1);

    // HSLで色相を変化させる (240(青) -> 0(赤))
    // ただし視認性を考慮して、
    // 0: 青, 0.5: 黄, 1.0: 赤 のようなヒートマップカラー
    // ライブラリなしでやるため、簡易的に閾値で分岐

    // 簡易パレット
    if (value > 1000) return '#800026';
    if (value > 500) return '#BD0026';
    if (value > 200) return '#E31A1C';
    if (value > 100) return '#FC4E2A';
    if (value > 50) return '#FD8D3C';
    if (value > 20) return '#FEB24C';
    if (value > 10) return '#FED976';
    return '#FFEDA0';
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.8
    });
    layer.bringToFront();
}

function resetHighlight(e) {
    if (geojsonLayer) {
        geojsonLayer.resetStyle(e.target);
    }
}

