export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-neutral-300 px-3 py-1 text-xs uppercase tracking-widest text-neutral-500">
        En construction
      </span>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Suffrage</h1>
      <p className="max-w-xl text-lg text-neutral-500">
        Concevez simplement des systèmes de vote — du suffrage universel direct
        majoritaire au Condorcet randomisé — et comparez leurs avantages et
        inconvénients.
      </p>
      <p className="text-sm text-neutral-400">
        L’interface définitive sera intégrée depuis la maquette Scrutin.
      </p>
    </main>
  );
}
