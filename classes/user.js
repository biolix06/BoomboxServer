const snowflake = require('node-snowflake').Snowflake;
const permissions = require('./permissions');

module.exports = class User {
    constructor(username, permissions = 0, id = null, blocked = false, lastUpdated = Date.now()) {
        this.id = id || snowflake.nextId();
        this.username = username;
        this.permissions = permissions;
        this.blocked = blocked;
        this.lastUpdated = lastUpdated;
    }

    addPermission(permission) {
        return permissions.addPermission(this.permissions, permission);
    }

    removePermission(permission) {
        return permissions.removePermission(this.permissions, permission);
    }

    hasPermission(permission) {
        return permissions.hasPermission(this.permissions, permission);
    }

    rename(username) {
        this.username = username;
        this.lastUpdated = Date.now();
    }

    block() {
        this.blocked = true;
        this.lastUpdated = Date.now();
    }

    unblock() {
        this.blocked = false;
        this.lastUpdated = Date.now();
    }
};