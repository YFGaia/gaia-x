export enum SessionChannel {
    SET_SESSION = "session:set",
    GET_COOKIES = "session:get-cookies",
    REMOVE_COOKIE = "session:remove-cookie",
}

export enum TokenChannel {
    GET_TOKEN = "token:get",
    CLEAR_TOKEN = "token:clear"
}