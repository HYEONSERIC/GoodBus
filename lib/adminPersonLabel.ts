type LabelablePerson = {
    email?: string | null;
    displayName?: string | null;
    companyName?: string | null;
    phoneNumber?: string | null;
};

/** 관리자 화면에서 사용자 참조를 사람이 읽을 라벨로 변환 — 전화 전용 가입자는
 * email이 없어서 이름/회사명/전화번호까지 순서대로 대체함 */
export function adminPersonLabel(person: LabelablePerson | null | undefined) {
    if (!person) return '알 수 없음';
    return (
        person.displayName ||
        person.companyName ||
        person.email ||
        person.phoneNumber ||
        '알 수 없음'
    );
}
