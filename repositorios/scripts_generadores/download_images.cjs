const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
  // --- MODELOS Y ATLETAS ---
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'modelo_femenino_mancuernas.jpg',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'modelo_masculino_fuerza.jpg',
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'atleta_crossfit_cuerdas.jpg',
    url: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'modelo_culturista_pose.jpg',
    url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'entrenadora_personal_fit.jpg',
    url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'atleta_boxeo_entrenamiento.jpg',
    url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'avatar_socio_hombre_1.jpg',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'avatar_socia_mujer_1.jpg',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'avatar_socio_atleta_2.jpg',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/modelos_y_atletas',
    file: 'avatar_socia_atleta_2.jpg',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=85'
  },

  // --- MÁQUINAS Y EQUIPAMIENTO ---
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/maquinas_y_equipamiento',
    file: 'sala_maquinas_gimnasio_panoramica.jpg',
    url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/maquinas_y_equipamiento',
    file: 'rack_mancuernas_profesional.jpg',
    url: 'https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/maquinas_y_equipamiento',
    file: 'barra_olimpica_y_discos.jpg',
    url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/maquinas_y_equipamiento',
    file: 'caminadoras_cardio_fila.jpg',
    url: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/maquinas_y_equipamiento',
    file: 'banco_pesas_reclinable.jpg',
    url: 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/maquinas_y_equipamiento',
    file: 'pesas_rusas_kettlebells.jpg',
    url: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/maquinas_y_equipamiento',
    file: 'zona_entrenamiento_funcional.jpg',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/maquinas_y_equipamiento',
    file: 'entrada_gimnasio_recepcion.jpg',
    url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1200&q=85'
  },

  // --- SUPLEMENTOS Y PUNTO DE VENTA (POS) ---
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/suplementos_punto_de_venta',
    file: 'bote_proteina_shaker.jpg',
    url: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=1000&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/suplementos_punto_de_venta',
    file: 'bebida_hidratante_fitness.jpg',
    url: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=1000&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/suplementos_punto_de_venta',
    file: 'guantes_y_straps_gimnasio.jpg',
    url: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=1000&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/suplementos_punto_de_venta',
    file: 'snack_barra_proteica_avena.jpg',
    url: 'https://images.unsplash.com/photo-1622484214644-84617a26f0f5?w=1000&q=85'
  },
  {
    folder: '02_IMAGENES_ALTA_CALIDAD/suplementos_punto_de_venta',
    file: 'shaker_botella_mezcladora.jpg',
    url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=1000&q=85'
  }
];

function download(item) {
  return new Promise((resolve, reject) => {
    const destDir = path.resolve(__dirname, item.folder);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, item.file);

    const get = (url) => {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download ${item.file}: HTTP ${res.statusCode}`));
        }
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          const stats = fs.statSync(destPath);
          console.log(`[OK] Descargado: ${item.file} (${Math.round(stats.size / 1024)} KB)`);
          resolve(destPath);
        });
      }).on('error', (err) => {
        reject(err);
      });
    };

    get(item.url);
  });
}

async function run() {
  console.log(`Iniciando descarga de ${assets.length} imágenes en alta definición...`);
  for (const asset of assets) {
    try {
      await download(asset);
    } catch (e) {
      console.warn(`[WARN] No se pudo descargar ${asset.file}: ${e.message}`);
    }
  }
  console.log('¡Descarga de imágenes completada!');
}

run();
