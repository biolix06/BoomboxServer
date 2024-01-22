const PERMISSIONS = {
  READ: 1 << 0,                     //1
  SEND: (1 << 0) | (1 << 1),        //3
  DELETE: 1 << 2,                   //4
  EDIT: (1 << 2) | (1 << 3),        //12
  CONFIG: 1 << 4,                   //16
  ADDUSER: 1 << 5,                  //32
  REMOVEUSER: (1 << 5) | (1 << 6),  //96
  ALL: 0b01111111,                  //191
  ROOT: 0b11111111,                 //255

  addPermission: function (user, permission) {
    if (this.hasPermission(user, permission)) {
      return false;
    }
    user.permissions |= permission;
    return true;
  },

  removePermission: function (user, permission) {
    if (!this.hasPermission(user, permission)) {
      return false;
    }
    user.permissions &= ~permission;
    return true;
  },
  
  hasPermission: function (user, permission) {
    return (user.permissions & permission) === permission;
  },

  isHigher: function (user, permission) {
    return (user.permissions & permission) > user.permissions;
  }
};
  
module.exports = PERMISSIONS;

// This permission system is from another project of mine, and I'm not sure if it's the best way to do it.
// Some of the permissions are not used in this project, but I left them in there in case I want to use them later.