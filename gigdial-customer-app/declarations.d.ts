declare module "*.module.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module "@/global.css" {
  const content: any;
  export default content;
}
