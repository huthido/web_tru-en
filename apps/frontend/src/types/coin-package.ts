export interface CoinPackage {
    id: string;
    name: string;
    coinAmount: number;
    priceVND: number;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCoinPackageDto {
    name: string;
    coinAmount: number;
    priceVND: number;
    description?: string;
    isActive?: boolean;
}

export interface UpdateCoinPackageDto extends Partial<CreateCoinPackageDto> { }
