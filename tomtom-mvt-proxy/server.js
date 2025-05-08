import express from 'express';
import fetch from 'node-fetch';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import vtpbf from 'vt-pbf';

const app = express();

// Put your TomTom API key here
const TOMTOM_KEY = 'OmjEMxlFBTDgePnLouGkZi2uxweKy3bA';
// Template for TomTom vector tile URL
const TOMTOM_URL = `https://api.tomtom.com/map/1/tile/basic/{z}/{x}/{y}.pbf?key=${OmjEMxlFBTDgePnLouGkZi2uxweKy3bA}`;

// Proxy endpoint for Mapbox-compatible MVT tiles
app.get('/tiles/:z/:x/:y.pbf', async (req, res) => {
  try {
    const { z, x, y } = req.params;
    // Fetch the TomTom PBF tile
    const url = TOMTOM_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const tileResp = await fetch(url);
    if (!tileResp.ok) {
      return res.status(tileResp.status).send(tileResp.statusText);
    }

    // Read response as ArrayBuffer
    const arrayBuffer = await tileResp.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    // Decode proprietary TomTom PBF
    const tile = new VectorTile(new Pbf(buf));

    // Convert decoded layers into Mapbox-compliant object
    const layers = {};
    for (const layerName in tile.layers) {
      const layer = tile.layers[layerName];
      const features = [];
      for (let i = 0; i < layer.length; i++) {
        features.push(layer.feature(i));
      }
      layers[layerName] = {
        version: layer.version,
        name: layer.name,
        extent: layer.extent,
        length: layer.length,
        features: features,
      };
    }

    // Re-encode as Mapbox MVT
    const mvtBuffer = vtpbf.fromVectorTileJs(layers);

    // Stream back to client
    res.setHeader('Content-Type', 'application/x-protobuf');
    res.send(Buffer.from(mvtBuffer));
  } catch (err) {
    console.error(err);
    res.status(500).send('Tile proxy error');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy listening on :${PORT}`));
