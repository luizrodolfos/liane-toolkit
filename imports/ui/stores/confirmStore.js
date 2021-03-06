export default class ConfirmStore {
  constructor() {
    this.open = false;
    this.text = "Are you sure?";
    this.subscriptions = [];
  }
  show({ text, callback }) {
    this.open = true;
    this.text = text;
    this.callback = callback;
    this.subscriptions.forEach(f => f());
  }
  hide() {
    this.open = false;
    this.subscriptions.forEach(f => f());
  }
  subscribe(f) {
    this.subscriptions.push(f);
  }
}
