/// <reference types="jest" />

declare module "supertest" {
  import { Agent } from "http";
  
  interface Test {
    [key: string]: any;
  }
  
  function supertest(app: any): Test;
  export { supertest };
}
