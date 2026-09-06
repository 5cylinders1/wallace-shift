import { useEffect, useState, type DependencyList } from 'react'

/**
 * Owns a GPU resource across React's development double-mount.
 *
 * The obvious shape — build it in `useMemo`, free it in an effect's
 * cleanup — is wrong under StrictMode, and wrong in a way that is easy to
 * misread as a shader bug. React renders twice, keeps the second memo
 * result, then mounts, cleans up and mounts again. The cleanup therefore
 * disposes the very object the second mount goes on to use.
 *
 * For most three.js objects that is survivable: disposing a material only
 * releases its compiled program and disposing a geometry only releases its
 * buffers, and the renderer rebuilds both from data still held on the CPU.
 * A render target has no CPU-side copy. It is silently re-allocated empty
 * — which is exactly what happened to the environment cube here, and why
 * the sky, the reflections and every highlight on the metal came back
 * black from a cube map that had rendered correctly.
 *
 * Creating inside the effect fixes it: the instance handed to the scene is
 * always the one the current mount created, and every instance is disposed
 * exactly once.
 *
 * Returns null on the first render, so callers must handle "not ready".
 *
 * `create` and `dispose` are captured from the render that last supplied a
 * changed `deps`, so anything they close over must appear in `deps`.
 */
export function useDisposable<T>(
  create: () => T,
  dispose: (value: T) => void,
  deps: DependencyList,
): T | null {
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => {
    const instance = create()
    // Allocating on mount and rendering once the resource exists is what
    // this hook is for; the state write happens once per dependency
    // change, not per render, so there is no cascade for the rule to
    // catch. There is no way to express "own an external resource" that
    // does not publish it from an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(instance)
    return () => {
      setValue(null)
      dispose(instance)
    }
    // The caller's `deps` is the contract; `create` and `dispose` are
    // fresh closures every render and would re-run this on every one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return value
}
