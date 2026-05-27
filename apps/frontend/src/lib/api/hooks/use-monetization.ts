import { useQuery } from '@tanstack/react-query';
import {
  MonetizationService,
  MonetizationEligibility,
} from '../monetization.service';

/**
 * Trạng thái mở khoá Trung tâm Kiếm tiền của user hiện tại.
 *
 * staleTime 5 phút: eligibility ít đổi (view/follower tăng dần); không cần
 * refetch quá thường. Khi admin xử lý UgcReport → user mất eligibility ở lần
 * fetch tiếp theo trong vòng 5 phút.
 */
export function useMyMonetizationEligibility(enabled: boolean = true) {
  return useQuery<MonetizationEligibility>({
    queryKey: ['monetization', 'eligibility', 'me'],
    queryFn: () => MonetizationService.getMyEligibility(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
