(function () {
    function decodeBuffer(buffer, encoding) {
        try {
            return new TextDecoder(encoding).decode(buffer);
        } catch (error) {
            return '';
        }
    }

    function scoreDecodedText(text) {
        if (!text) {
            return -Infinity;
        }
        const replacementCount = (text.match(/\uFFFD/g) || []).length;
        const headerScore = ['营期', '班级', '添加人数'].reduce((acc, key) => acc + (text.includes(key) ? 4 : 0), 0);
        const commaScore = Math.min((text.match(/,/g) || []).length, 40) / 10;
        const tabScore = Math.min((text.match(/\t/g) || []).length, 40) / 10;
        return headerScore + commaScore + tabScore - replacementCount * 5;
    }

    function decodeCsvBuffer(buffer) {
        const candidates = ['utf-8', 'utf-8-sig', 'utf-16', 'utf-16le', 'gb18030', 'gbk', 'big5'];
        let best = '';
        let bestScore = -Infinity;
        candidates.forEach((encoding) => {
            const decoded = decodeBuffer(buffer, encoding);
            const score = scoreDecodedText(decoded);
            if (score > bestScore) {
                bestScore = score;
                best = decoded;
            }
        });
        return best || decodeBuffer(buffer, 'utf-8');
    }

    function normalizeLineEndings(text) {
        return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');
    }

    function detectDelimiter(text) {
        const firstLine = normalizeLineEndings(text).split('\n').find((line) => String(line).trim()) || '';
        const candidates = [',', '\t', ';', '|'];
        let bestDelimiter = ',';
        let bestCount = -1;
        candidates.forEach((delimiter) => {
            const count = firstLine.split(delimiter).length - 1;
            if (count > bestCount) {
                bestCount = count;
                bestDelimiter = delimiter;
            }
        });
        return bestDelimiter;
    }

    function parseDelimitedText(text, delimiter) {
        const normalized = normalizeLineEndings(text);
        const rows = [];
        let row = [];
        let current = '';
        let inQuotes = false;

        for (let index = 0; index < normalized.length; index += 1) {
            const char = normalized[index];
            const nextChar = normalized[index + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === delimiter && !inQuotes) {
                row.push(current);
                current = '';
                continue;
            }

            if (char === '\n' && !inQuotes) {
                row.push(current);
                rows.push(row);
                row = [];
                current = '';
                continue;
            }

            current += char;
        }

        if (current.length || row.length) {
            row.push(current);
            rows.push(row);
        }

        return rows
            .map((line) => line.map((cell) => String(cell || '').trim()))
            .filter((line) => line.some(Boolean));
    }

    function parseCSV(text) {
        const delimiter = detectDelimiter(text);
        const matrix = parseDelimitedText(text, delimiter);
        if (!matrix.length) {
            return { columns: [], rows: [] };
        }
        const columns = matrix[0].map((column) => String(column || '').trim());
        const rows = matrix.slice(1).map((cells) => {
            const record = {};
            columns.forEach((column, index) => {
                record[column] = cells[index] === undefined ? '' : cells[index];
            });
            return record;
        });
        return { columns, rows };
    }

    function parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.onload = () => {
                try {
                    const buffer = reader.result;
                    const text = decodeCsvBuffer(buffer);
                    resolve(parseCSV(text));
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    window.ABToolParser = {
        parseCSV,
        parseCSVFile
    };
})();
