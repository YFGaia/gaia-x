export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export interface PaginationParams {
    page: number;
    pageSize: number;
}

