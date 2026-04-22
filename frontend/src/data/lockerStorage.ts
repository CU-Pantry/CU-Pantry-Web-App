import type { LockerStorageType } from './fakeData';

export function areLockerStoragesCompatible(
  requiredStorageType: LockerStorageType,
  lockerStorageType: LockerStorageType,
) {
  const requiresFrozenLocker = requiredStorageType === 'frozen';
  const lockerIsFrozen = lockerStorageType === 'frozen';
  return requiresFrozenLocker === lockerIsFrozen;
}

export function describeLockerStorageGroup(storageType: LockerStorageType) {
  return storageType === 'frozen' ? 'Frozen' : 'Dry / Refrigerated';
}