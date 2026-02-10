import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCoinPackageDto {
    @IsNotEmpty({ message: 'Tên gói không được để trống' })
    @IsString()
    name: string;

    @IsNotEmpty({ message: 'Số lượng xu không được để trống' })
    @IsNumber()
    @Min(1, { message: 'Số lượng xu phải lớn hơn 0' })
    coinAmount: number;

    @IsNotEmpty({ message: 'Giá tiền không được để trống' })
    @IsNumber()
    @Min(0, { message: 'Giá tiền không được nhỏ hơn 0' })
    priceVND: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
