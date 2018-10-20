import { ParcelOptions } from 'parcel-bundler';

export default (isProduction: boolean): ParcelOptions => {
  return {
    outDir: './public',
    outFile: 'entry.html',
    publicUrl: '/public',
    contentHash: isProduction,
    watch: !isProduction,
    minify: isProduction,
    cacheDir: '.parcel-cache',
    cache: true,
    sourceMaps: true,
    detailedReport: true
  };
};
