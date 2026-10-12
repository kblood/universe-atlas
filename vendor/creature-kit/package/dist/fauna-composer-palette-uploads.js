/** Tracks pending RGBA component ranges until Three actually uploads the texture.
 * One pooled range per palette row: repeated updates without a render cannot
 * grow the queue or lose changes from an earlier simulation frame. */
export class ComposerPaletteUploads {
    texture = null;
    priorUpdate = null;
    ranges;
    pending;
    rowStride = 0;
    fullPending = true;
    partial;
    queued = 0;
    changedSinceFlush = false;
    uploadedBytes = 0;
    uploadCount = 0;
    capacity;
    constructor(capacity, partial = true) {
        if (!Number.isSafeInteger(capacity) || capacity < 1)
            throw new Error('Invalid palette capacity');
        this.capacity = capacity;
        this.partial = partial;
        this.pending = new Uint8Array(capacity);
        this.ranges = Array.from({ length: capacity }, () => ({ start: 0, count: 0 }));
    }
    onUploaded = () => {
        this.uploadedBytes += this.queued;
        this.uploadCount++;
        this.pending.fill(0);
        this.fullPending = false;
        this.queued = 0;
        this.changedSinceFlush = false;
        if (this.texture)
            this.priorUpdate?.(this.texture);
    };
    attach(texture) {
        this.detach();
        const image = texture.image;
        if (image.height !== this.capacity || image.data.length !== image.width * image.height * 4)
            throw new Error('Invalid palette texture layout');
        this.texture = texture;
        this.rowStride = image.width * 4;
        this.priorUpdate = texture.onUpdate;
        texture.onUpdate = this.onUploaded;
        texture.clearUpdateRanges();
        this.pending.fill(0);
        this.fullPending = true;
        this.queued = image.data.byteLength;
        this.changedSinceFlush = false;
    }
    setPartial(value) {
        if (value === this.partial)
            return;
        this.partial = value;
        this.fullPending = true;
        if (this.texture) {
            this.texture.clearUpdateRanges();
            this.texture.needsUpdate = true;
            this.queued = this.texture.image.data.byteLength;
        }
    }
    mark(start, count) {
        if (!this.texture || !Number.isSafeInteger(start) || !Number.isSafeInteger(count) || start < 0 || count < 1)
            throw new Error('Invalid palette dirty range');
        const row = Math.floor(start / this.rowStride), end = start + count;
        if (row >= this.capacity || end > (row + 1) * this.rowStride)
            throw new Error('Palette dirty range crosses a row');
        // Texture updateRanges use scalar components; whole RGBA texels are required.
        const first = Math.floor(start / 4) * 4, last = Math.ceil(end / 4) * 4, range = this.ranges[row];
        if (this.pending[row]) {
            const oldEnd = range.start + range.count;
            range.start = Math.min(range.start, first);
            range.count = Math.max(oldEnd, last) - range.start;
        }
        else {
            range.start = first;
            range.count = last - first;
            this.pending[row] = 1;
        }
        this.changedSinceFlush = true;
    }
    /** Queued byte count, not an assertion that the GPU has already consumed it. */
    flush() {
        const texture = this.texture;
        if (!texture)
            return 0;
        if (!this.changedSinceFlush)
            return 0;
        this.changedSinceFlush = false;
        texture.clearUpdateRanges();
        if (!this.partial || this.fullPending)
            this.queued = texture.image.data.byteLength;
        else {
            this.queued = 0;
            for (let row = 0; row < this.capacity; row++)
                if (this.pending[row]) {
                    const range = this.ranges[row];
                    texture.updateRanges.push(range);
                    this.queued += range.count * 4;
                }
        }
        texture.needsUpdate = true;
        return this.queued;
    }
    get pendingBytes() { return this.queued; }
    /** Typed flags plus a conservative 64-byte allowance per pooled range. */
    get ownedBytes() { return this.pending.byteLength + this.ranges.length * 64; }
    detach() {
        if (this.texture) {
            this.texture.clearUpdateRanges();
            if (this.texture.onUpdate === this.onUploaded)
                this.texture.onUpdate = this.priorUpdate;
        }
        this.texture = null;
        this.priorUpdate = null;
        this.pending.fill(0);
        this.queued = 0;
        this.changedSinceFlush = false;
    }
    dispose() { this.detach(); this.pending = new Uint8Array(0); this.ranges.length = 0; }
}
