import {
  Device,
  Log,
  UserProfile,
  Project,
  User,
  UsersRole,
} from '@prisma/client';

export interface UserInput extends User {
  devices: Device[];
  logs: Log[];
  profile: UserProfile;
  roles: UsersRole[] | RolesEnum[];
  Project: Project[];
}

export enum RolesEnum {
  super = 0,
  admin = 1,
  user = 2,
}
