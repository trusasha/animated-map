export const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

// same tiles under several hostnames: all are HTTP/1.1, so each extra host adds 6 parallel connections
export const DEM = ['s3.amazonaws.com/elevation-tiles-prod', 'elevation-tiles-prod.s3.amazonaws.com', 'elevation-tiles-prod.s3.us-east-1.amazonaws.com']
  .map((h) => `dem://${h}/terrarium/{z}/{x}/{y}.png`);
export const ESRI_HOSTS = ['server', 'services'].map((h) => `https://${h}.arcgisonline.com/ArcGIS/rest/services`);

/** the default (5) evicts most of a route's warm-up before playback reaches it */
export const TILE_CACHE_ZOOM_LEVELS = 200;
