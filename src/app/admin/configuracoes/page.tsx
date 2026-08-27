import { getAiSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export default async function ConfiguracoesPage() {
  const settings = await getAiSettings();

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Configurações</h1>
      <p className="mb-6 text-sm text-slate-500">
        Escolha e configure o provedor de IA usado para gerar o conteúdo das trilhas e o roteiro de
        cada vídeo (design system + storyboard). O provedor escolhido aqui é sempre o usado — a
        montagem do projeto HyperFrames e a renderização em si são feitas diretamente pelo servidor,
        sem depender de nenhum provedor específico.
      </p>

      <SettingsForm initial={settings} />
    </div>
  );
}
