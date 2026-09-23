import type { DomainEvent } from '../../shared/types.js';
type Listener = (event:DomainEvent)=>void|Promise<void>;

export class EventBus {
  private listeners = new Set<Listener>();
  subscribe(listener:Listener):()=>void { this.listeners.add(listener); return ()=>this.listeners.delete(listener); }
  async publish(event:DomainEvent):Promise<void> { await Promise.all([...this.listeners].map(listener=>listener(event))); }
}
