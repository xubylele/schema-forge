declare module 'update-notifier' {
  interface Options {
    pkg: { name: string; version: string };
    updateCheckInterval?: number;
    shouldNotifyInNpmScript?: boolean;
  }
  function updateNotifier(options: Options): { notify: () => void };
  export default updateNotifier;
}
