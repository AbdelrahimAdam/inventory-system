/// <reference types="vite/client" />

declare module "*.worker.js" {
  const workerSrc: string;
  export default workerSrc;
}
