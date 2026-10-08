import { afterEach, describe, expect, it } from 'vitest';
import {
    ALIMTALK_TEMPLATES,
    isAlimtalkTemplateEnabled,
    renderAlimtalkText,
} from './alimtalkTemplates';

// Aligo에 실제 등록·승인된 본문과 동일해야 한다. 템플릿 본문을 바꾸면 재심사가 필요하므로
// 이 기대값도 등록본이 바뀔 때만 함께 수정한다.
const REGISTERED_BID_ARRIVED = [
    '[버스대절 주식회사]',
    '',
    '홍길동님, 등록하신 여정에 새 입찰이 도착했습니다.',
    '',
    '■ 여정 정보',
    '- 출발지 : 서울',
    '- 도착지 : 부산',
    '- 출발 : 2026-10-10 09:00',
    '',
    '■ 입찰 정보',
    '- 입찰 금액 : 150만원',
    '- 입찰자 : 김기사',
    '',
    '받으신 입찰을 확인하고 비교해 보세요.',
    '',
    '※ 본 메시지는 고객님께서 입찰 알림 수신에 동의하신 여정에 한해, 새 입찰이 등록될 때마다 발송됩니다.',
].join('\n');

const REGISTERED_AWARD_COMPLETED = [
    '[버스대절 주식회사]',
    '',
    '김기사 기사님, 축하드립니다.',
    '기사님께서 입찰하신 주문이 낙찰되었습니다.',
    '',
    '■ 운행요금 안내',
    '- 총 요금 : 150만원',
    '- 입찰 운행요금 : 150만원',
    '- 부가 서비스 요금 : 0원',
    '',
    '■ 포함사항',
    '통행료·주차비 포함, 별도 요금 없음',
    '',
    '■ 결제방법',
    '현금결제',
    '',
    '■ 고객님 연락처',
    '- 이름 : 홍길동',
    '- 연락처 : 01012345678',
    '',
    '■ 운행 정보',
    '- 출발지 : 서울',
    '- 도착지 : 부산',
    '- 출발 : 2026-10-10 09:00',
    '- 귀환 : 편도 운행',
    '- 차량 : 대형버스',
    '- 운행형태 : 편도',
    '- 인원 : 30명',
    '',
    '운행 전 고객님께 연락하여 정확한 탑승 장소와 시간을 확인해 주세요.',
    '',
    '부당한 방법으로 수수료를 면탈하거나 고객에게 별도의 계약을 요구하는 행위가 확인되는 경우 서비스 이용이 제한될 수 있습니다.',
].join('\n');

const REGISTERED_AWARD_CONFIRMED = [
    '[버스대절 주식회사]',
    '',
    '홍길동님, 여정에 기사님이 확정되었습니다.',
    '',
    '■ 확정된 기사 정보',
    '- 기사명 : 김기사',
    '- 연락처 : 01000000099',
    '- 차량 : 대형버스',
    '',
    '■ 운행 정보',
    '- 출발지 : 서울',
    '- 도착지 : 부산',
    '- 출발 : 2026-10-10 09:00',
    '- 귀환 : 편도 운행',
    '',
    '운행 전 기사님과 탑승 장소·시간을 미리 확인해 주세요.',
].join('\n');

const REGISTERED_TRIP_CANCELLED = [
    '[버스대절 주식회사 - 예약 취소 안내]',
    '',
    '김기사 기사님,',
    '아래 주문이 고객 요청으로 취소되었습니다.',
    '',
    '■ 취소된 운행',
    '- 출발지 : 서울',
    '- 도착지 : 부산',
    '- 출발 : 2026-10-10 09:00',
    '- 귀환 : 편도 운행',
    '- 차량 : 대형버스',
    '- 운행형태 : 편도',
    '- 인원 : 30명',
    '',
    '이미 결제된 수수료 또는 정산금이 있는 경우 취소 규정에 따라 처리됩니다.',
    '',
    '자세한 내용은 주문내역에서 확인해 주세요.',
].join('\n');

const REGISTERED_REFUND_COMPLETED = [
    '[버스대절 주식회사 - 환불 완료]',
    '',
    '안녕하세요. 김기사 기사님.',
    '',
    '취소된 주문에 대한 수수료 환불 처리가 완료되었습니다.',
    '',
    '■ 환불 내역',
    '- 환불 금액 : 150,000원',
    '- 취소 사유 : 일정 변경',
    '',
    '■ 취소된 운행',
    '- 출발지 : 서울',
    '- 도착지 : 부산',
    '- 출발 : 2026-10-10 09:00',
    '- 귀환 : 편도 운행',
    '- 차량 : 대형버스',
    '',
    '카드 결제의 경우 카드사 사정에 따라 실제 환불 반영까지 일정 기간이 소요될 수 있습니다.',
].join('\n');

const REGISTERED_DOCUMENT_APPROVED = [
    '[버스대절 주식회사 - 서류 심사 완료]',
    '',
    '안녕하세요. 김기사 님.',
    '',
    '제출해주신 운전면허증 심사가 승인되었습니다.',
    '이제부터 여정 입찰에 참여하실 수 있습니다.',
    '',
    '■ 승인 정보',
    '- 심사 항목 : 운전면허증',
    '- 승인일 : 2026-10-10 09:00',
    '',
    '버스대절과 함께해 주셔서 감사합니다.',
].join('\n');

const REGISTERED_DOCUMENT_REJECTED = [
    '[버스대절 주식회사 - 서류 심사 안내]',
    '',
    '안녕하세요. 김기사 님.',
    '',
    '제출해주신 운전면허증 심사 결과, 아쉽게도 반려되었습니다.',
    '',
    '■ 반려 사유',
    '사진이 흐릿하여 식별이 어렵습니다.',
    '',
    '사유를 확인하신 후 서류를 다시 제출해 주세요.',
].join('\n');

const REGISTERED_RECURRING_PAYMENT_FAILED = [
    '[버스대절 주식회사 - 결제 안내]',
    '',
    '안녕하세요. 김기사 님.',
    '',
    '등록하신 카드로 멤버십(Premium) 정기결제를 시도했으나 결제에 실패했습니다.',
    '',
    '■ 결제 정보',
    '- 결제 항목 : 멤버십(Premium)',
    '- 결제 금액 : 30,000원',
    '- 실패일 : 2026-10-10 09:00',
    '',
    '카드 정보를 확인하시고 다시 등록해 주세요. 결제가 계속 실패할 경우 서비스 이용이 제한될 수 있습니다.',
].join('\n');

const REGISTERED_MEMBERSHIP_PAYMENT_COMPLETED = [
    '[버스대절 주식회사 - 결제 완료]',
    '',
    '안녕하세요. 김기사 님.',
    '',
    '멤버십(Premium) 정기결제가 정상적으로 완료되었습니다.',
    '',
    '■ 결제 정보',
    '- 결제 항목 : 멤버십(Premium)',
    '- 결제 금액 : 30,000원',
    '- 결제일 : 2026-10-10 09:00',
    '- 다음 결제 예정일 : 2026-11-10',
].join('\n');

const REGISTERED_CARD_CHANGED = [
    '[버스대절 주식회사 - 보안 안내]',
    '',
    '안녕하세요. 김기사 님.',
    '',
    '결제카드가 등록되었습니다.',
    '',
    '■ 카드 정보',
    '- 카드사 : 국민카드',
    '- 카드번호 : 1234',
    '- 처리 시각 : 2026-10-10 09:00',
    '',
    '본인이 요청하지 않은 변경이라면 즉시 고객센터로 문의해 주세요.',
].join('\n');

const REGISTERED_BID_MILESTONE = [
    '[버스대절 주식회사]',
    '',
    '홍길동님의 여정에 입찰이',
    '총 5건 등록되었습니다.',
    '',
    '여정 정보 보기 버튼으로',
    '전체 입찰 내역을 확인하세요.',
    '',
    '※ 본 메시지는 고객님께서 입찰 알림 수신에 동의하신 여정에 한해, 입찰 건수 알림은 최대 10건까지만 발송됩니다.',
].join('\n');

describe('renderAlimtalkText', () => {
    it('치환 후 #{ 가 남지 않는다', () => {
        expect(renderAlimtalkText('안녕 #{a}, #{b}', { a: 'X', b: 'Y' })).toBe(
            '안녕 X, Y',
        );
    });

    it('변수가 빠지면 발송 전에 던진다', () => {
        expect(() => renderAlimtalkText('#{a} #{b}', { a: 'X' })).toThrow(
            /missing variables: b/,
        );
    });
});

describe('ALIMTALK_TEMPLATES 등록본 일치', () => {
    it('회원가입안내(WELCOME) 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(ALIMTALK_TEMPLATES.WELCOME.body, {
            고객명: '홍길동',
        });
        expect(rendered).toBe(
            [
                '[버스대절 주식회사]',
                '',
                '홍길동님, 버스대절 회원가입을 환영합니다.',
                '',
                '여정 견적과 입찰 내역을 한곳에서 편하게 확인하실 수 있습니다.',
                '',
                "※ 견적등록 알림을 받고 싶지 않으시면 로그인 후 알림 설정에서 '견적등록 알림'을 꺼주세요.",
            ].join('\n'),
        );
    });

    it('승객_입찰도착 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(ALIMTALK_TEMPLATES.BID_ARRIVED.body, {
            고객명: '홍길동',
            출발지: '서울',
            도착지: '부산',
            출발일시: '2026-10-10 09:00',
            입찰금액: '150만원',
            입찰자명: '김기사',
        });
        expect(rendered).toBe(REGISTERED_BID_ARRIVED);
    });

    it('승객_입찰마일스톤 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.BID_MILESTONE.body,
            { 고객명: '홍길동', 입찰건수: '5' },
        );
        expect(rendered).toBe(REGISTERED_BID_MILESTONE);
    });

    it('기사_낙찰완료 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.AWARD_COMPLETED.body,
            {
                기사명: '김기사',
                총요금: '150만원',
                운행요금: '150만원',
                부가서비스요금: '0원',
                포함사항: '통행료·주차비 포함, 별도 요금 없음',
                결제방법: '현금결제',
                고객명: '홍길동',
                고객연락처: '01012345678',
                출발지: '서울',
                도착지: '부산',
                출발일시: '2026-10-10 09:00',
                귀환일시: '편도 운행',
                차량정보: '대형버스',
                운행형태: '편도',
                인원: '30',
            },
        );
        expect(rendered).toBe(REGISTERED_AWARD_COMPLETED);
    });

    it('승객_낙찰확정 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.AWARD_CONFIRMED.body,
            {
                고객명: '홍길동',
                기사명: '김기사',
                기사연락처: '01000000099',
                차량정보: '대형버스',
                출발지: '서울',
                도착지: '부산',
                출발일시: '2026-10-10 09:00',
                귀환일시: '편도 운행',
            },
        );
        expect(rendered).toBe(REGISTERED_AWARD_CONFIRMED);
    });

    it('기사_예약취소 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.TRIP_CANCELLED.body,
            {
                기사명: '김기사',
                출발지: '서울',
                도착지: '부산',
                출발일시: '2026-10-10 09:00',
                귀환일시: '편도 운행',
                차량정보: '대형버스',
                운행형태: '편도',
                인원: '30',
            },
        );
        expect(rendered).toBe(REGISTERED_TRIP_CANCELLED);
    });

    it('기사_수수료환불완료 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.REFUND_COMPLETED.body,
            {
                기사명: '김기사',
                환불금액: '150,000원',
                취소사유: '일정 변경',
                출발지: '서울',
                도착지: '부산',
                출발일시: '2026-10-10 09:00',
                귀환일시: '편도 운행',
                차량정보: '대형버스',
            },
        );
        expect(rendered).toBe(REGISTERED_REFUND_COMPLETED);
    });

    it('기사_서류심사승인 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.DOCUMENT_APPROVED.body,
            {
                기사명: '김기사',
                서류종류: '운전면허증',
                승인일시: '2026-10-10 09:00',
            },
        );
        expect(rendered).toBe(REGISTERED_DOCUMENT_APPROVED);
    });

    it('기사_서류심사반려 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.DOCUMENT_REJECTED.body,
            {
                기사명: '김기사',
                서류종류: '운전면허증',
                반려사유: '사진이 흐릿하여 식별이 어렵습니다.',
            },
        );
        expect(rendered).toBe(REGISTERED_DOCUMENT_REJECTED);
    });

    it('기사_정기결제실패 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.RECURRING_PAYMENT_FAILED.body,
            {
                기사명: '김기사',
                결제항목: '멤버십(Premium)',
                결제금액: '30,000원',
                실패일시: '2026-10-10 09:00',
            },
        );
        expect(rendered).toBe(REGISTERED_RECURRING_PAYMENT_FAILED);
    });

    it('기사_멤버십결제완료 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.MEMBERSHIP_PAYMENT_COMPLETED.body,
            {
                기사명: '김기사',
                결제항목: '멤버십(Premium)',
                결제금액: '30,000원',
                결제일시: '2026-10-10 09:00',
                다음결제일: '2026-11-10',
            },
        );
        expect(rendered).toBe(REGISTERED_MEMBERSHIP_PAYMENT_COMPLETED);
    });

    it('기사_카드등록변경 본문이 등록본과 같다', () => {
        const rendered = renderAlimtalkText(
            ALIMTALK_TEMPLATES.CARD_CHANGED.body,
            {
                기사명: '김기사',
                변경유형: '등록',
                카드사: '국민카드',
                카드번호뒤4자리: '1234',
                처리일시: '2026-10-10 09:00',
            },
        );
        expect(rendered).toBe(REGISTERED_CARD_CHANGED);
    });

    it('대체문자 본문도 모든 변수가 채워진다', () => {
        const arrived = renderAlimtalkText(ALIMTALK_TEMPLATES.BID_ARRIVED.fallbackText, {
            고객명: '홍길동',
            출발지: '서울',
            도착지: '부산',
            입찰금액: '150만원',
            입찰자명: '김기사',
        });
        expect(arrived).not.toContain('#{');
        const milestone = renderAlimtalkText(
            ALIMTALK_TEMPLATES.BID_MILESTONE.fallbackText,
            { 고객명: '홍길동', 입찰건수: '10' },
        );
        expect(milestone).not.toContain('#{');
        const award = renderAlimtalkText(
            ALIMTALK_TEMPLATES.AWARD_COMPLETED.fallbackText,
            {
                기사명: '김기사',
                출발지: '서울',
                도착지: '부산',
                출발일시: '2026-10-10 09:00',
            },
        );
        expect(award).not.toContain('#{');
        const confirmed = renderAlimtalkText(
            ALIMTALK_TEMPLATES.AWARD_CONFIRMED.fallbackText,
            {
                고객명: '홍길동',
                기사명: '김기사',
                기사연락처: '01000000099',
                출발지: '서울',
                도착지: '부산',
            },
        );
        expect(confirmed).not.toContain('#{');
        const cancelled = renderAlimtalkText(
            ALIMTALK_TEMPLATES.TRIP_CANCELLED.fallbackText,
            {
                기사명: '김기사',
                출발지: '서울',
                도착지: '부산',
                출발일시: '2026-10-10 09:00',
            },
        );
        expect(cancelled).not.toContain('#{');
        const refunded = renderAlimtalkText(
            ALIMTALK_TEMPLATES.REFUND_COMPLETED.fallbackText,
            {
                기사명: '김기사',
                환불금액: '150,000원',
                출발지: '서울',
                도착지: '부산',
            },
        );
        expect(refunded).not.toContain('#{');
        const approved = renderAlimtalkText(
            ALIMTALK_TEMPLATES.DOCUMENT_APPROVED.fallbackText,
            { 기사명: '김기사', 서류종류: '운전면허증' },
        );
        expect(approved).not.toContain('#{');
        const rejected = renderAlimtalkText(
            ALIMTALK_TEMPLATES.DOCUMENT_REJECTED.fallbackText,
            {
                기사명: '김기사',
                서류종류: '운전면허증',
                반려사유: '사진이 흐릿하여 식별이 어렵습니다.',
            },
        );
        expect(rejected).not.toContain('#{');
        const billingFailed = renderAlimtalkText(
            ALIMTALK_TEMPLATES.RECURRING_PAYMENT_FAILED.fallbackText,
            {
                기사명: '김기사',
                결제항목: '멤버십(Premium)',
                결제금액: '30,000원',
            },
        );
        expect(billingFailed).not.toContain('#{');
        const membershipPaid = renderAlimtalkText(
            ALIMTALK_TEMPLATES.MEMBERSHIP_PAYMENT_COMPLETED.fallbackText,
            {
                기사명: '김기사',
                결제항목: '멤버십(Premium)',
                결제금액: '30,000원',
                다음결제일: '2026-11-10',
            },
        );
        expect(membershipPaid).not.toContain('#{');
        const cardChanged = renderAlimtalkText(
            ALIMTALK_TEMPLATES.CARD_CHANGED.fallbackText,
            {
                기사명: '김기사',
                변경유형: '등록',
                카드사: '국민카드',
                카드번호뒤4자리: '1234',
            },
        );
        expect(cardChanged).not.toContain('#{');
    });
});

describe('isAlimtalkTemplateEnabled', () => {
    const saved = { ...process.env };

    afterEach(() => {
        process.env = { ...saved };
    });

    it('ALIMTALK_ENABLED_TEMPLATES 목록에 있는 템플릿만 켜진다', () => {
        process.env.ALIMTALK_ENABLED_TEMPLATES = 'BID_ARRIVED, BID_MILESTONE';
        delete process.env.ALIMTALK_DISABLED;
        expect(isAlimtalkTemplateEnabled('BID_ARRIVED')).toBe(true);
        expect(isAlimtalkTemplateEnabled('BID_MILESTONE')).toBe(true);
    });

    it('목록이 없으면 전부 꺼진다', () => {
        delete process.env.ALIMTALK_ENABLED_TEMPLATES;
        delete process.env.ALIMTALK_DISABLED;
        expect(isAlimtalkTemplateEnabled('BID_ARRIVED')).toBe(false);
    });

    it('ALIMTALK_DISABLED=true면 목록과 무관하게 전부 꺼진다', () => {
        process.env.ALIMTALK_ENABLED_TEMPLATES = 'BID_ARRIVED';
        process.env.ALIMTALK_DISABLED = 'true';
        expect(isAlimtalkTemplateEnabled('BID_ARRIVED')).toBe(false);
    });
});
