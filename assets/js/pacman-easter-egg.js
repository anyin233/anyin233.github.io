(function () {
    "use strict";

    function initPacmanEasterEgg() {
        var root = document.querySelector("[data-pacman-root]");
        var control = document.querySelector("[data-pacman-control]");

        if (!root || !control) {
            return;
        }

        var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var targets = Array.prototype.slice.call(document.querySelectorAll(".card, .rounded-xl"))
            .filter(function (element) {
                return !element.closest("[data-pacman-root]") &&
                    !element.parentElement.closest(".card, .rounded-xl");
            });
        var dragState = null;
        var position = { left: 0, top: 0 };
        var hasPosition = false;
        var lastPointer = null;
        var eatenCount = 0;
        var isEating = false;
        var keyboardMoved = false;
        var hoveredTarget = null;
        var triggerBiteTimer = null;

        function clamp(value, minimum, maximum) {
            return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
        }

        function controlSize() {
            return control.getBoundingClientRect().width || 64;
        }

        function setPosition(left, top) {
            var size = controlSize();
            position.left = clamp(left, 8, window.innerWidth - size - 8);
            position.top = clamp(top, 8, window.innerHeight - size - 8);
            control.style.left = position.left + "px";
            control.style.top = position.top + "px";
            control.style.right = "auto";
            control.style.bottom = "auto";
            var hintCenter = clamp(position.left + size / 2, 74, window.innerWidth - 74);
            root.style.setProperty("--pacman-hint-left", hintCenter + "px");
            root.style.setProperty("--pacman-hint-top", position.top + "px");
            hasPosition = true;
        }

        function setInitialPosition() {
            control.style.left = "24px";
            control.style.top = "auto";
            control.style.right = "auto";
            control.style.bottom = "24px";

            var rect = control.getBoundingClientRect();
            position.left = rect.left;
            position.top = rect.top;
            root.style.setProperty("--pacman-hint-left", clamp(rect.left + rect.width / 2, 74, window.innerWidth - 74) + "px");
            root.style.setProperty("--pacman-hint-top", rect.top + "px");
            hasPosition = true;
            return rect.width > 0 && rect.height > 0;
        }

        function keepInViewport() {
            if (!hasPosition || control.style.bottom === "24px") {
                setInitialPosition();
                return;
            }
            setPosition(position.left, position.top);
        }

        function updateDirection(deltaX, deltaY) {
            if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
                return;
            }
            var angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            var pixelAngle = Math.round(angle / 90) * 90;
            control.style.setProperty("--pacman-angle", pixelAngle + "deg");
        }

        function pointDistance(first, second) {
            return Math.hypot(second[0] - first[0], second[1] - first[1]);
        }

        function addPathPoint(points, point) {
            if (!points.length || pointDistance(points[points.length - 1], point) > 4) {
                points.push(point);
            }
        }

        function buildEatingPath(targetRect, pacmanCenter) {
            var width = targetRect.width;
            var height = targetRect.height;
            var rowHeight = Math.max(58, Math.min(84, controlSize() * 1.08));
            var start = [
                clamp(pacmanCenter.x - targetRect.left, 0, width),
                clamp(pacmanCenter.y - targetRect.top, 0, height)
            ];
            var points = [start];
            var direction = 1;
            var y = height;

            addPathPoint(points, [0, height]);
            while (true) {
                addPathPoint(points, [direction === 1 ? width : 0, y]);
                if (y === 0) {
                    break;
                }
                y = Math.max(0, y - rowHeight);
                addPathPoint(points, [direction === 1 ? width : 0, y]);
                direction *= -1;
            }

            return {
                points: points,
                strokeWidth: rowHeight + 8
            };
        }

        function createEatingTrail(target, targetRect, eatingPath) {
            var namespace = "http://www.w3.org/2000/svg";
            var svg = document.createElementNS(namespace, "svg");
            var path = document.createElementNS(namespace, "path");
            var pathData = eatingPath.points.map(function (point, index) {
                return (index === 0 ? "M " : "L ") + point[0].toFixed(2) + " " + point[1].toFixed(2);
            }).join(" ");

            svg.setAttribute("class", "pacman-eaten-trail");
            svg.setAttribute("viewBox", "0 0 " + targetRect.width + " " + targetRect.height);
            svg.setAttribute("preserveAspectRatio", "none");
            svg.setAttribute("aria-hidden", "true");
            path.setAttribute("d", pathData);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "currentColor");
            path.setAttribute("stroke-width", eatingPath.strokeWidth);
            path.setAttribute("stroke-linecap", "square");
            path.setAttribute("stroke-linejoin", "miter");
            svg.appendChild(path);
            target.appendChild(svg);

            var length = path.getTotalLength();
            path.style.strokeDasharray = length + " " + length;
            path.style.strokeDashoffset = length;

            return { path: path, length: length };
        }

        function samplePath(points, segments, distance) {
            var remaining = distance;
            for (var index = 0; index < segments.length; index += 1) {
                var segment = segments[index];
                if (remaining <= segment.length || index === segments.length - 1) {
                    var ratio = segment.length === 0 ? 1 : remaining / segment.length;
                    return [
                        segment.start[0] + (segment.end[0] - segment.start[0]) * ratio,
                        segment.start[1] + (segment.end[1] - segment.start[1]) * ratio
                    ];
                }
                remaining -= segment.length;
            }
            return points[points.length - 1];
        }

        function createCrumb(container, point, index) {
            var crumb = document.createElement("span");
            var direction = index % 2 === 0 ? -1 : 1;
            crumb.className = "pacman-crumb";
            crumb.style.setProperty("--crumb-left", point[0] + "px");
            crumb.style.setProperty("--crumb-top", point[1] + "px");
            crumb.style.setProperty("--crumb-x", direction * (6 + index % 3 * 5) + "px");
            crumb.style.setProperty("--crumb-y", -(8 + index % 4 * 5) + "px");
            crumb.style.setProperty("--crumb-rotate", direction * (18 + index * 7) + "deg");
            crumb.style.setProperty("--crumb-delay", (index % 3) * 24 + "ms");
            if (index % 3 === 0) {
                crumb.classList.add("is-large");
            }
            container.appendChild(crumb);
            window.setTimeout(function () {
                if (crumb.parentNode === container) {
                    container.removeChild(crumb);
                }
            }, 1000);
        }

        function clearTriggerFeedback() {
            if (triggerBiteTimer !== null) {
                window.clearInterval(triggerBiteTimer);
                triggerBiteTimer = null;
            }
            hoveredTarget = null;
            control.classList.remove("is-target-hovering", "is-mouth-closed");
        }

        function setTriggerFeedback(target) {
            if (hoveredTarget === target) {
                return;
            }

            clearTriggerFeedback();
            if (!target) {
                return;
            }

            hoveredTarget = target;
            control.classList.add("is-target-hovering");
            triggerBiteTimer = window.setInterval(function () {
                if (!isEating && hoveredTarget === target) {
                    control.classList.toggle("is-mouth-closed");
                }
            }, reducedMotion ? 220 : 115);
        }

        function animateEating(target, trail, crumbs, eatingPath) {
            var segments = [];
            var totalDistance = 0;
            var points = eatingPath.points;

            points.slice(1).forEach(function (point, index) {
                var start = points[index];
                var length = pointDistance(start, point);
                segments.push({ start: start, end: point, length: length });
                totalDistance += length;
            });

            var duration = reducedMotion ? 80 : Math.max(2600, Math.min(5600, totalDistance * 0.72));
            var startedAt = null;
            var lastPoint = points[0];
            var lastCrumbAt = -Infinity;
            var crumbIndex = 0;

            isEating = true;
            control.setAttribute("aria-busy", "true");
            control.classList.add("is-eating");

            function step(timestamp) {
                if (startedAt === null) {
                    startedAt = timestamp;
                }

                var progress = Math.min(1, (timestamp - startedAt) / duration);
                var currentDistance = totalDistance * progress;
                var currentPoint = samplePath(points, segments, currentDistance);
                var currentRect = target.getBoundingClientRect();
                var size = controlSize();

                trail.path.style.strokeDashoffset = String(trail.length * (1 - progress));
                setPosition(currentRect.left + currentPoint[0] - size / 2, currentRect.top + currentPoint[1] - size / 2);
                updateDirection(currentPoint[0] - lastPoint[0], currentPoint[1] - lastPoint[1]);
                control.classList.toggle("is-mouth-closed", Math.floor((timestamp - startedAt) / 115) % 2 === 1);

                if (timestamp - lastCrumbAt > 105 && progress < 0.98) {
                    createCrumb(crumbs, currentPoint, crumbIndex);
                    crumbIndex += 1;
                    lastCrumbAt = timestamp;
                }
                lastPoint = currentPoint;

                if (progress < 1) {
                    window.requestAnimationFrame(step);
                    return;
                }

                target.classList.add("pacman-target--eaten");
                target.setAttribute("aria-hidden", "true");
                control.classList.remove("is-eating", "is-mouth-closed");
                control.removeAttribute("aria-busy");
                isEating = false;
            }

            window.requestAnimationFrame(step);
        }

        function makeWafer(target, pacmanCenter) {
            if (target.dataset.pacmanEaten === "true") {
                return;
            }

            clearTriggerFeedback();
            var targetRect = target.getBoundingClientRect();
            var wafer = document.createElement("div");
            var crumbs = document.createElement("div");
            var eatingPath = buildEatingPath(targetRect, pacmanCenter);

            wafer.className = "pacman-wafer";
            wafer.setAttribute("aria-hidden", "true");
            crumbs.className = "pacman-crumbs";
            crumbs.setAttribute("aria-hidden", "true");

            target.dataset.pacmanEaten = "true";
            target.classList.add("pacman-target--wafer");
            target.appendChild(wafer);
            target.appendChild(crumbs);
            eatenCount += 1;
            root.style.setProperty("--pacman-eaten-count", eatenCount);
            var trail = createEatingTrail(target, targetRect, eatingPath);
            animateEating(target, trail, crumbs, eatingPath);
        }

        function findCollision() {
            var controlRect = control.getBoundingClientRect();
            var radius = controlRect.width * 0.38;
            var center = {
                x: controlRect.left + controlRect.width / 2,
                y: controlRect.top + controlRect.height / 2
            };
            var collision = null;

            targets.some(function (target) {
                if (target.dataset.pacmanEaten === "true") {
                    return false;
                }

                var targetRect = target.getBoundingClientRect();
                var closestX = clamp(center.x, targetRect.left, targetRect.right);
                var closestY = clamp(center.y, targetRect.top, targetRect.bottom);
                var distanceX = center.x - closestX;
                var distanceY = center.y - closestY;

                if ((distanceX * distanceX) + (distanceY * distanceY) <= radius * radius) {
                    collision = { target: target, center: center };
                    return true;
                }
                return false;
            });

            return collision;
        }

        function updateTriggerFeedback() {
            if (isEating) {
                return;
            }
            var collision = findCollision();
            setTriggerFeedback(collision ? collision.target : null);
        }

        function checkCollisions() {
            if (isEating) {
                return;
            }

            var collision = findCollision();
            if (collision) {
                makeWafer(collision.target, collision.center);
                return;
            }
            clearTriggerFeedback();
        }

        function beginDrag(event) {
            if (isEating || dragState || (event.button !== undefined && event.button !== 0)) {
                return;
            }

            var rect = control.getBoundingClientRect();
            clearTriggerFeedback();
            dragState = {
                pointerId: event.pointerId,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top
            };
            setPosition(rect.left, rect.top);
            keyboardMoved = false;
            lastPointer = { x: event.clientX, y: event.clientY };
            control.setPointerCapture(event.pointerId);
            control.classList.add("is-dragging");
            root.classList.add("is-dragging");
            event.preventDefault();
        }

        function moveDrag(event) {
            if (!dragState || event.pointerId !== dragState.pointerId) {
                return;
            }

            setPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
            updateDirection(event.clientX - lastPointer.x, event.clientY - lastPointer.y);
            lastPointer = { x: event.clientX, y: event.clientY };
            updateTriggerFeedback();
            event.preventDefault();
        }

        function endDrag(event, shouldEat) {
            if (!dragState || (event && event.pointerId !== dragState.pointerId)) {
                return;
            }

            var pointerId = dragState.pointerId;
            if (shouldEat) {
                setPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
            } else {
                clearTriggerFeedback();
            }
            dragState = null;
            if (control.hasPointerCapture(pointerId)) {
                control.releasePointerCapture(pointerId);
            }
            control.classList.remove("is-dragging");
            root.classList.remove("is-dragging");
            if (shouldEat) {
                checkCollisions();
            }
        }

        function moveWithKeyboard(deltaX, deltaY) {
            if (isEating) {
                return;
            }
            if (!hasPosition) {
                setInitialPosition();
            }
            setPosition(position.left + deltaX, position.top + deltaY);
            updateDirection(deltaX, deltaY);
            keyboardMoved = true;
            updateTriggerFeedback();
        }

        setInitialPosition();
        window.requestAnimationFrame(function () {
            if (!dragState && !isEating) {
                setInitialPosition();
            }
        });
        control.addEventListener("pointerdown", beginDrag);
        control.addEventListener("pointermove", moveDrag);
        control.addEventListener("pointerup", function (event) {
            endDrag(event, true);
        });
        control.addEventListener("pointercancel", function (event) {
            endDrag(event, false);
        });
        control.addEventListener("lostpointercapture", function (event) {
            endDrag(event, false);
        });
        control.addEventListener("keydown", function (event) {
            var step = event.shiftKey ? 64 : 32;
            var deltas = {
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0]
            };

            if (!deltas[event.key]) {
                return;
            }
            event.preventDefault();
            moveWithKeyboard(deltas[event.key][0], deltas[event.key][1]);
        });
        control.addEventListener("keyup", function (event) {
            if (keyboardMoved && /^Arrow(Up|Down|Left|Right)$/.test(event.key)) {
                keyboardMoved = false;
                checkCollisions();
            }
        });
        window.addEventListener("resize", keepInViewport);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPacmanEasterEgg);
    } else {
        initPacmanEasterEgg();
    }
}());
