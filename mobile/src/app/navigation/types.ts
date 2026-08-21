export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Report: undefined;
  Alerts: undefined;
  Profile: undefined;
  Admin: undefined;
  Map: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  IncidentDetail: { incidentId: string; incidentData?: import('../../shared/types/app').Incident };
  AlertDetail: { alertId: string; alertData?: import('../../shared/types/app').AlertItem };
  OperatorResponses: undefined;
};
