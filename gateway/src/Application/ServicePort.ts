import type { Service } from "../domain";
export interface ServiceReply { status: number; body?: any }
export interface ServicePort {
  call(service: Service, method: string, path: string, bearer?: string, body?: unknown, correlation?: string): Promise<ServiceReply>;
}
