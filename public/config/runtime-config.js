export const runtimeConfig = {
  event: { name: '', edition: '', date: '', location: '' },
  audience: {
    publicUrl: 'https://apresentaokalil.luckphantomhive.workers.dev/mobile/',
    path: 'mobile/',
    qrCodeEnabled: true,
    qrCodeLabel: 'Acompanhe pelo celular'
  },
  features: {
    audiencePage: true,
    qrCode: true,
    localPresenterControl: true,
    livePolls: true,
    audienceQuestions: true,
    remoteControl: false,
    productionRealtime: false
  },
  realtime: {
    mode: 'local',
    apiBaseUrl: '',
    wsPath: '/ws',
    sessionId: 'contratos-praticos-kalil'
  }
};
