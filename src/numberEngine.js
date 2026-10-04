// 숫자 토큰 추출
function extractNumberTokens(words) {
    return words.filter(word => /^\d+$/.test(word.text));
}

// 숫자 변경
function changeNumbers(tokens) {

    return tokens.map(token => {

        const original = token.text;

        const value = Number(original);

        // 테스트용 : 1~9 랜덤 증가
        const add = Math.floor(Math.random() * 9) + 1;

        const changed = String(value + add);

        return {
            ...token,
            original,
            changed
        };

    });

}

module.exports = {
    extractNumberTokens,
    changeNumbers
};