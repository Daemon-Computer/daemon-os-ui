// Enum to match Rust-side ProgramPartName for WASM
export enum ProgramPartName {
  EMPTY = 'Empty',
  EMPTY_BODY = 'EmptyBody',
  SIMPLE_BODY = 'SimpleBody',
  SIMPLE_LIMB = 'SimpleLimb',
  SIMPLE_EYE = 'SimpleEye',
  VIRUS_LIMB = 'VirusLimb',
  // Robot
  BOX_ROBOT_BODY = 'BoxRobotBody',
  ROUND_ROBOT_BODY = 'RoundRobotBody',
  BOX_ROBOT_HEAD = 'BoxRobotHead',
  PYRAMID_ROBOT_HEAD = 'PyramidRobotHead',
  SPHERE_ROBOT_HEAD = 'SphereRobotHead',
  CAMERA_ROBOT_EYE = 'CameraRobotEye',
  FEELER_ROBOT_EYE = 'FeelerRobotEye',
  SLEEK_CAMERA_ROBOT_EYE = 'SleekCameraRobotEye',
  HEXAGONAL_ROBOT_LEG_BASE = 'HexagonalRobotLegBase',
  CROWNED_ROBOT_LEG_BASE = 'CrownedRobotLegBase',
  STRAIGHT_ROBOT_LEG_TIBIA = 'StraightRobotLegTibia',
  MIDDLE_ROBOT_LEG_TIBIA = 'MiddleRobotLegTibia',
  SIDE_ROBOT_LEG_TIBIA = 'SideRobotLegTibia',
  HEXAGONAL_ROBOT_LEG_JOINT = 'HexagonalRobotLegJoint',
  CROSS_ROBOT_LEG_JOINT = 'CrossRobotLegJoint',
  STAR_ROBOT_LEG_JOINT = 'StarRobotLegJoint',
  SIDE_ROBOT_LEG_END = 'SideRobotLegEnd',
  // Addon
  ANTENNA_ROBOT_ADDON = 'AntennaRobotAddon',
}
